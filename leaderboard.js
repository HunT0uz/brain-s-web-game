/**
 * 🏆 停云献礼 - 通用排行榜模块
 * 支持本地存储与云端扩展
 */
const Leaderboard = (function() {
    // ================= 配置区 =================
    // 若要开启云端排行榜，请在 LeanCloud (https://www.leancloud.cn/) 申请账号
    // 并填入下方的 AppID 和 AppKey，然后将 USE_CLOUD 设为 true
    const USE_CLOUD = false; 
    const LEANCLOUD_ID = "您的AppID";
    const LEANCLOUD_KEY = "您的AppKey";
    const LEANCLOUD_SERVER = "您的REST API服务器地址"; // e.g., https://xxx.api.lncldglobal.com

    // ================= 样式表 =================
    const styles = `
        .lb-overlay {
            position: fixed;
            top: 0; left: 0; width: 100%; height: 100%;
            background: rgba(0, 0, 0, 0.85);
            display: none;
            justify-content: center;
            align-items: center;
            z-index: 9999;
            backdrop-filter: blur(5px);
            font-family: 'Microsoft YaHei', sans-serif;
        }
        .lb-container {
            background: linear-gradient(145deg, #1a1a2e, #16213e);
            width: 90%;
            max-width: 500px;
            border-radius: 15px;
            border: 1px solid #f39c12;
            box-shadow: 0 0 30px rgba(243, 156, 18, 0.3);
            display: flex;
            flex-direction: column;
            overflow: hidden;
            animation: lb-fade-in 0.3s ease;
        }
        @keyframes lb-fade-in { from {opacity: 0; transform: scale(0.9);} to {opacity: 1; transform: scale(1);} }
        .lb-header {
            background: rgba(243, 156, 18, 0.15);
            padding: 20px;
            text-align: center;
            border-bottom: 1px solid rgba(243, 156, 18, 0.3);
        }
        .lb-header h2 {
            color: #f39c12;
            margin: 0;
            font-size: 1.8rem;
        }
        .lb-tabs {
            display: flex;
            background: rgba(0,0,0,0.2);
        }
        .lb-tab {
            flex: 1;
            padding: 15px;
            text-align: center;
            color: #888;
            cursor: pointer;
            transition: all 0.3s;
            border-bottom: 2px solid transparent;
        }
        .lb-tab.active {
            color: #fff;
            background: rgba(255,255,255,0.05);
            border-bottom-color: #f39c12;
        }
        .lb-content {
            padding: 20px;
            min-height: 300px;
            max-height: 50vh;
            overflow-y: auto;
        }
        .lb-item {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 12px;
            margin-bottom: 8px;
            background: rgba(255,255,255,0.05);
            border-radius: 8px;
            color: #fff;
        }
        .lb-item.top-1 { border: 1px solid #ffd700; background: linear-gradient(90deg, rgba(255,215,0,0.2), transparent); }
        .lb-item.top-2 { border: 1px solid #c0c0c0; background: linear-gradient(90deg, rgba(192,192,192,0.2), transparent); }
        .lb-item.top-3 { border: 1px solid #cd7f32; background: linear-gradient(90deg, rgba(205,127,50,0.2), transparent); }
        
        .lb-rank { font-weight: bold; width: 30px; }
        .lb-name { flex: 1; text-align: left; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; padding-right: 10px; }
        .lb-score { font-family: monospace; font-size: 1.1em; color: #f39c12; }
        
        .lb-footer {
            padding: 15px;
            text-align: center;
            border-top: 1px solid rgba(255,255,255,0.1);
        }
        .lb-btn {
            background: #f39c12;
            border: none;
            color: #1a1a2e;
            padding: 8px 25px;
            border-radius: 20px;
            font-weight: bold;
            cursor: pointer;
            transition: 0.2s;
        }
        .lb-btn:hover { background: #e67e22; transform: scale(1.05); }
        .lb-btn-close { background: transparent; border: 1px solid #666; color: #aaa; margin-right: 10px; }
        .lb-btn-close:hover { background: rgba(255,255,255,0.1); color: #fff; }

        /* 输入名字的弹窗 */
        .lb-name-input {
            width: 100%;
            padding: 10px;
            margin: 10px 0;
            background: rgba(0,0,0,0.3);
            border: 1px solid #444;
            color: #fff;
            border-radius: 5px;
            text-align: center;
            font-size: 1.1rem;
        }
    `;

    // 注入样式
    const styleSheet = document.createElement("style");
    styleSheet.innerText = styles;
    document.head.appendChild(styleSheet);

    // ================= 逻辑区 =================
    
    // 初始化 HTML 结构
    const overlay = document.createElement('div');
    overlay.className = 'lb-overlay';
    overlay.innerHTML = `
        <div class="lb-container">
            <div class="lb-header">
                <h2>🏆 忘归人·英杰榜</h2>
            </div>
            <div class="lb-tabs" id="lb-tabs">
                <div class="lb-tab active" data-game="tetris">方块</div>
                <div class="lb-tab" data-game="snake">贪吃蛇</div>
                <div class="lb-tab" data-game="2048">2048</div>
                <div class="lb-tab" data-game="minesweeper">扫雷</div>
                <div class="lb-tab" data-game="sokoban">推箱子</div>
                <div class="lb-tab" data-game="memory">翻牌</div>
            </div>
            <div class="lb-content" id="lb-list">
                <!-- 列表项 -->
            </div>
            <div class="lb-footer">
                <button class="lb-btn lb-btn-close" onclick="Leaderboard.hide()">关闭</button>
            </div>
        </div>
    `;
    document.body.appendChild(overlay);

    // 当前选中的游戏
    let activeGame = 'tetris';

    // 绑定 Tab 切换
    const tabs = overlay.querySelectorAll('.lb-tab');
    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            tabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            activeGame = tab.dataset.game;
            renderList();
        });
    });

    // 获取当前用户名称
    function getUserName() {
        return localStorage.getItem('fox_username');
    }

    // 保存成绩 (核心逻辑：只存最佳)
    async function saveScore(game, score, formatting = null) {
        const user = getUserName();
        // 若无名号，则不参与排名
        if (!user) {
            console.log("无名侠客，不录榜单");
            return;
        }

        const key = `fox_lb_${game}`;
        
        // 1. 获取现有数据
        let data = [];
        if (USE_CLOUD) {
            // TODO: 云端获取逻辑
            console.log("云端功能需配置 LeanCloud");
        } else {
            const raw = localStorage.getItem(key);
            if (raw) data = JSON.parse(raw);
        }

        // 2. 查找用户
        const existingIndex = data.findIndex(item => item.user === user);
        
        // 3. 比较并更新
        let updated = false;
        if (existingIndex >= 0) {
            // 如果是记忆翻牌(moves)，可能是越小越好；
            // 这里我们假设 Tetris 是分高者胜，Memory 我们将转换成一种“积分”来比较
            // 或者简单点：如果新分数 > 旧分数，则更新。
            // 对于 Memory，我们传入的 score 应该是一个统一的衡量标准 (例如: 10000 - moves * 10 - time)
            
            if (score > data[existingIndex].score) {
                data[existingIndex].score = score;
                data[existingIndex].date = new Date().toISOString();
                if (formatting) data[existingIndex].fmt = formatting; // 保存格式化后的字符串(如 "20步")
                updated = true;
            }
        } else {
            data.push({
                user: user,
                score: score,
                date: new Date().toISOString(),
                fmt: formatting
            });
            updated = true;
        }

        // 4. 排序 (降序)
        data.sort((a, b) => b.score - a.score);

        // 5. 保存
        if (USE_CLOUD) {
            // TODO: 云端保存逻辑
        } else {
            localStorage.setItem(key, JSON.stringify(data));
        }

        if (updated) {
            alert(`成绩已记录！恩公 ${user} 目前在【${getGameName(game)}】中排名第 ${data.findIndex(i => i.user === user) + 1}`);
        }
    }

    function getGameName(game) {
        const map = { 
            'tetris': '俄罗斯方块', 
            'memory': '记忆翻牌', 
            'sokoban': '推箱子',
            'snake': '贪吃蛇',
            '2048': '2048',
            'minesweeper': '扫雷'
        };
        return map[game] || game;
    }

    // 渲染列表
    function renderList() {
        const listContainer = document.getElementById('lb-list');
        listContainer.innerHTML = '<div style="text-align:center;color:#666;margin-top:20px;">正在查阅卷宗...</div>';

        const key = `fox_lb_${activeGame}`;
        let data = [];
        
        if (USE_CLOUD) {
            // Cloud mock
        } else {
            const raw = localStorage.getItem(key);
            if (raw) data = JSON.parse(raw);
        }

        listContainer.innerHTML = '';
        if (data.length === 0) {
            listContainer.innerHTML = '<div style="text-align:center;color:#888;margin-top:50px;">暂无记录，恩公快来争夺榜首！</div>';
            return;
        }

        data.forEach((item, index) => {
            const div = document.createElement('div');
            let rankClass = '';
            let rankIcon = index + 1;
            if (index === 0) { rankClass = 'top-1'; rankIcon = '🥇'; }
            else if (index === 1) { rankClass = 'top-2'; rankIcon = '🥈'; }
            else if (index === 2) { rankClass = 'top-3'; rankIcon = '🥉'; }

            div.className = `lb-item ${rankClass}`;
            // 优先显示格式化过的成绩(fmt)，否则显示原始分数
            div.innerHTML = `
                <span class="lb-rank">${rankIcon}</span>
                <span class="lb-name">${item.user}</span>
                <span class="lb-score">${item.fmt || item.score}</span>
            `;
            listContainer.appendChild(div);
        });
    }

    // ================= 公开接口 =================
    return {
        show: function(defaultGame) {
            if (defaultGame) {
                activeGame = defaultGame;
                tabs.forEach(t => {
                    t.classList.remove('active');
                    if (t.dataset.game === defaultGame) t.classList.add('active');
                });
            }
            overlay.style.display = 'flex';
            renderList();
        },
        hide: function() {
            overlay.style.display = 'none';
        },
        // score: 数值用于排序 (越大越好)
        // formatText: 显示在榜单上的文本 (如 "1200分" 或 "20步 30秒")
        submit: function(game, score, formatText) {
            saveScore(game, score, formatText);
        },
        resetUser: function() {
            localStorage.removeItem('fox_username');
            alert("身份已重置，下次记录时请重新署名。");
        }
    };
})();
