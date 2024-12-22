async function fetchSampleData() {
    const response = await fetch('samples.json');
    const data = await response.json();
    return data;
}

function statusManager() {
    const defaultMessage = '各項目をクリックすることで直接編集できます。';
    let activeElement = null; // フォーカスまたはホバー中の要素
    let typingTimeout;

    return {
        status: {
            name: '', occupation: '',
            stats: {basic: [], detail: [], sum: {}},
            equipmentList: [], money: '', skills: []
        },
        currentMessage: defaultMessage,
        currentDisplayedMessage: '',
        samples: [],
        showModal: false,
        modalMessage: '',
        modalCallback: null,
        menuStructure: [],
        async init() {
            this.samples = await fetchSampleData();
            if (this.samples.length > 0) {
                // TODO: 最後に保存したものがある場合はそれをロード
                this.status = JSON.parse(JSON.stringify(this.samples[0]));
                this.menuStructure = this.createMenuStructure(); // 動的にメニュー生成
            }
            this.displayMessage();
        },
        createMenuStructure() {
            const menuBack = { name: "もどる", isBack: true, message: "一つ前のメニューに戻ります。" };
            return [
                {
                    name: "ほぞん",
                    message: "ステータスを保存します。",
                    submenu: [
                        {
                            name: "画像",
                            action: () => this.saveAsImage(),
                            message: "PNG画像形式で保存します。"
                        },
                        {
                            name: "ファイル",
                            action: () => this.saveAsJSON(),
                            message: "この機能で読み込める形式（JSON）で保存します。"
                        },
                        menuBack
                    ]
                },
                {
                    name: "よみこみ",
                    message: "ステータスを読み込みます。",
                    submenu: [
                        {
                            name: "サンプル",
                            message: "サンプルデータを読み込みます。",
                            submenu: [
                                ...this.samples.map(sample => ({
                                    name: sample.name,
                                    action: () => this.loadFromSample(sample),
                                    message: `${sample.name}　のデータを読み込みます。`
                                })),
                                menuBack
                            ]
                        },
                        {
                            name: "ファイル",
                            action: this.loadFromJSON,
                            message: "この機能で保存したファイル（JSON）を読み込みます。"
                        },
                        menuBack
                    ]
                }
            ];
        },
        // ほぞん
        saveAsImage() {
            // box-shadow がずれるので、現在の text-align を保存して一時的にリセット
            // TODO: 画面が一瞬ずれるので、他の手段を検討する
            const body = document.body;
            const originalTextAlign = window.getComputedStyle(body).textAlign;
            body.style.textAlign = "initial";
        
            html2canvas(document.querySelector("#statusCard"), {
                backgroundColor: null,
                onclone: (clonedDocument) => {
                    Array.from(clonedDocument.querySelectorAll('textarea')).forEach((textArea) => {
                        const div = clonedDocument.createElement('div')
                        div.innerText = textArea.value
                        textArea.style.display = 'none'
                        textArea.parentElement.append(div)
                    })
                }
            }).then(canvas => {
                document.body.style.textAlign = "initial";
                let link = document.createElement('a');
                link.download = 'status.png';
                link.href = canvas.toDataURL("image/png");
                link.click();
        
                // text-align を元に戻す
                body.style.textAlign = originalTextAlign;
            });
        },
        saveAsJSON() {
            const sanitizedFileName = this.sanitizeFileName(this.status.name);
            const dataStr = JSON.stringify(this.status, null, 2);
            const blob = new Blob([dataStr], { type: "application/json" });
            const link = document.createElement('a');
            link.href = URL.createObjectURL(blob);
            link.download = `${sanitizedFileName}.json`;
            link.click();
        },
        sanitizeFileName(name) {
            return name.replace(/[<>:"/\\|?*]+/g, '_').trim() || 'status';
        },
        // よみこみ
        loadFromSample(sample) {
            this.status = JSON.parse(JSON.stringify(sample));
            this.updateMessage(`${sample.name}　のデータを読み込みました。`);
        },
        loadFromJSON() {
            document.getElementById('jsonFileInput').click();
        },
        handleJSONFile(event) {
            const file = event.target.files[0];
            if (!file) return;
        
            const reader = new FileReader();
            reader.onload = (e) => {
                try {
                    const data = JSON.parse(e.target.result);
                    this.status = data;
                    this.updateMessage("データが正常に読み込まれました。");
                } catch (error) {
                    this.updateMessage("データの読み込みに失敗しました: " + error.message);
                }
            };
            reader.readAsText(file);
        },
        async displayMessage() {
            if (this.currentDisplayedMessage === this.currentMessage) {
                return; // メッセージが完全一致している場合はスキップ
            }
        
            if (this.currentMessage.startsWith(this.currentDisplayedMessage)) {
                // 前方一致している場合、差分を追加表示
                const remainingMessage = this.currentMessage.slice(this.currentDisplayedMessage.length);
                let index = 0;
        
                const typeNextChar = () => {
                    if (index < remainingMessage.length) {
                        this.currentDisplayedMessage += remainingMessage[index++];
                        typingTimeout = setTimeout(typeNextChar, 20);
                    }
                };
        
                if (typingTimeout) clearTimeout(typingTimeout);
                typeNextChar();
            } else {
                // メッセージが完全に違う場合、全体を再表示
                if (typingTimeout) clearTimeout(typingTimeout);
                this.currentDisplayedMessage = ''; // 現在の表示をリセット
                let index = 0;
        
                const typeNextChar = () => {
                    if (index < this.currentMessage.length) {
                        this.currentDisplayedMessage += this.currentMessage[index++];
                        typingTimeout = setTimeout(typeNextChar, 20);
                    }
                };
        
                typeNextChar();
            }
        },
        setMsg($el) {
            this.updateActiveMessage($el);
        },
        resetMsg() {
            this.clearActiveMessage();
        },
        updateMessage(message) {
            this.currentMessage = message;
            this.displayMessage();
        },
        updateActiveMessage($el) {
            activeElement = $el;
            this.updateMessage(this.determineMessage($el));
        },
        clearActiveMessage() {
            activeElement = null;
    
            setTimeout(() => {
                if (!activeElement) {
                    this.updateMessage(defaultMessage);
                }
            }, 300);
        },
        determineMessage($el) {
            // メッセージ配列を構築
            const messages = [];

            if ($el.dataset && $el.dataset.message) {
                return $el.dataset.message;
            } else if ($el.matches('input, textarea')) {
                const value = $el.value.trim();
                const isEmpty = value === '';
    
                // 定数でキーと効果のメッセージを短縮して定義
                const MSG = {
                    ADD_ROW: 'Enter： 項目追加',
                    DEL_ROW: 'BS/Del： 項目削除',
                    ADD_CAT: 'Enter： カテゴリー追加',
                    DEL_CAT: 'BS/Del： カテゴリー削除'
                };
    
                if ($el.classList.contains('name')) {
                    messages.push('なまえを　いれてください');
                } else if ($el.classList.contains('occupation')) {
                    messages.push('しょくぎょうを　いれてください');
                } else if ($el.classList.contains('stat-key')
                        || $el.classList.contains('stat-value')) {
                    messages.push('ステータスを　いれてください');
                    messages.push(MSG.ADD_ROW);
                    if (isEmpty) messages.push(MSG.DEL_ROW);
                } else if ($el.classList.contains('equipment-item')) {
                    messages.push('そうびを　いれてください');
                    messages.push(MSG.ADD_ROW);
                    if (isEmpty) messages.push(MSG.DEL_ROW);
                } else if ($el.classList.contains('money')) {
                    messages.push('しょじきんを　いれてください');
                } else if ($el.classList.contains('skill-item')) {
                    messages.push('スキルを　いれてください');
                    messages.push(MSG.ADD_ROW);
                    if (isEmpty) messages.push(MSG.DEL_ROW);
                } else if ($el.classList.contains('skill-category-name')) {
                    messages.push('カテゴリーを　いれてください');
                    messages.push(MSG.ADD_CAT);
                    if (isEmpty) messages.push(MSG.DEL_CAT);
                }
            }

            // メッセージを改行で結合して返す
            return messages.join('\n');
        },
        focusChild($focus) {
            const focusableElements = $focus.focusables();
            const target = focusableElements.length > 0 ? focusableElements[0] : null;
        
            if (target) {
                $focus.focus(target);
            }
        },
        calculateGridStyle(skills) {
            const maxSkillWidth = skills.reduce((max, skill) => Math.max(max, this.calculateWidthBasedOnCharacters(skill)), 0);
            return `grid-template-columns: repeat(auto-fit, minmax(${maxSkillWidth}ch, 1fr));`;
        },
        calculateWidthBasedOnCharacters(text) {
            const fullWidthCount = (text.match(/[\u3000-\u9FFF\uFF01-\uFF60\uFFE0-\uFFE6]/g) || []).length;
            const halfWidthCount = text.length - fullWidthCount;
            return fullWidthCount * 2 + halfWidthCount;
        },
        isObjectList(list) {
            return (
                Array.isArray(list) &&
                list.length > 0 &&
                typeof list[0] === 'object' &&
                typeof list[0].key === 'string' &&
                typeof list[0].value === 'string'
            );
        },
        isCategoryList(list) {
            return (
                Array.isArray(list) &&
                list.length > 0 &&
                typeof list[0] === 'object' &&
                typeof list[0].key === 'string' &&
                Array.isArray(list[0].value)
            );
        },
        handleKeydown(list, $event, $focus) {
            const key = $event.key.toLowerCase();
            const targetElement = $event.target;
            const currentIndex = parseInt(targetElement.dataset.index);
            const isInputEmpty = targetElement && targetElement.value === '';
    
            if (key === 'enter') {
                this.addItem(list, currentIndex, $focus);
                $event.preventDefault();
                $event.stopPropagation();
            } else if ((key === 'backspace' || key === 'delete') && isInputEmpty) {
                this.removeItem(list, currentIndex, key, $focus);
                $event.preventDefault();
                $event.stopPropagation();
            }
        },
        addItem(list, currentIndex, $focus) {
            let newItem;
            // データ構造に応じた新規項目を作成
            if (this.isObjectList(list)) {
                newItem = { key: '', value: '' }; // オブジェクト構造
            } else if (this.isCategoryList(list)) {
                newItem = { key: '', value: [''] }; // カテゴリリスト構造
            } else {
                newItem = ''; // 通常のリスト項目
            }
            list.splice(currentIndex + 1, 0, newItem);
        
            this.$nextTick(() => {
                const focusables = $focus.focusables();
                let nextFocusIndex;

                // フォーカス移動の調整
                if (this.isObjectList(list)) {
                    nextFocusIndex = (currentIndex + 1) * 2;
                } else if (this.isCategoryList(list)) {
                    nextFocusIndex = 0;
                    for (let i = 0; i <= currentIndex; i++) {
                        nextFocusIndex += list[i].value.length + 1;
                    }
                } else {
                    nextFocusIndex = currentIndex + 1;
                }

                if (focusables[nextFocusIndex]) {
                    focusables[nextFocusIndex].focus();
                }
            });
        },
        removeItem(list, currentIndex, key, $focus) {
            list.splice(currentIndex, 1);
        
            this.$nextTick(() => {
                const focusables = $focus.focusables();
                let nextIndex = key === 'backspace' ? currentIndex - 1 : currentIndex;
                let nextFocusIndex;
        
                // フォーカス移動の調整
                if (this.isObjectList(list)) {
                    // ステータスの場合
                    nextFocusIndex = nextIndex * 2;
                } else if (this.isCategoryList(list)) {
                    // スキルの場合
                    nextFocusIndex = 0;
                    for (let i = 0; i < nextIndex && list[i]; i++) {
                        nextFocusIndex += list[i].value.length + 1;
                    }
                } else {
                    nextFocusIndex = nextIndex;
                }
        
                if (focusables[nextFocusIndex]) {
                    focusables[nextFocusIndex].focus();
                }
            });
        },

        // 現在のメニューパス（スタック）
        activeMenuStack: [],

        handleMenuClick(item) {
            if (item.isBack) {
                // 「もどる」の処理
                this.handleBack();
            } else if (item.submenu) {
                // サブメニューを開く処理
                this.activeMenuStack.push(item.submenu);
            } else if (item.action) {
                // 通常のメニューアクション
                item.action();
            }
        },

        handleBack() {
            if (this.activeMenuStack.length > 0) {
                this.activeMenuStack.pop(); // 履歴スタックから戻る
            }
        },

        // 現在描画するサブメニュー
        get currentSubmenu() {
            return this.activeMenuStack.length > 0
                ? this.activeMenuStack[this.activeMenuStack.length - 1]
                : null;
        },
    };
}
