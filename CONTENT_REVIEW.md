# 教材內容檢視紀錄

原有課程檢視範圍：首頁與當時 22 個主題頁的教材文字、示範說明與本地資源連結。標示「無須修改」表示本輪未發現明確的教材文字錯誤，不代表已驗證所有互動演算法的數值結果。

| 主題 | 本輪檢視結果 |
| --- | --- |
特徵縮放 Feature Scaling | 修正 Z-score 不會把資料變成常態分布、離群值處理與 Min-Max 測試資料範圍的說明。 |
類別編碼 Categorical Encoding | 移除「無序類別使用一般樹模型就適合標籤編碼」的過度概括；補上原本空白的目標編碼結果、自訂目標值輸入與資料洩漏提醒。 |
資料降維 Dimensionality Reduction | 說明 t-SNE 為簡化示範，並將 PCA 的「保留資訊」說法改為保留變異量。 |
梯度下降 Gradient Descent | 無須修改。 |
線性回歸 Linear Regression | 將最佳化目標由含糊的「誤差總和」改為平方誤差。 |
邏輯回歸 Logistic Regression | 無須修改。 |
K 最近鄰 KNN | 無須修改。 |
決策樹 Decision Tree | 無須修改；原有互動版修改未被覆蓋。 |
支援向量機 SVM | 修正支持向量在軟邊界中的位置與 C 值、硬邊界的說明。 |
K-Means 分群 | 修正手肘法轉折點一定是最佳 K 值的暗示。 |
主成分分析 PCA | 將解釋變異數比例的意義限定為總變異，不等同於任務所需資訊。 |
過擬合與欠擬合 | 早停法改為使用驗證集，不使用測試集決定訓練停止點。 |
L1/L2 正則化 | 修正 L2 權重「不會變成 0」的絕對說法。 |
混淆矩陣 | 修正 Precision 與 Recall 「互斥」及調整閾值必然一升一降的說法。 |
激活函數 Activation Functions | 修正 Swish 導數公式與導數曲線的計算。 |
損失函數 Loss Functions | 無須修改。 |
多層感知器 MLP | 無須修改。 |
Tokenizer 分詞器 | 加入簡化示範與示意 ID 的提醒，修正 emoji 會被拆成 UTF-16 片段的問題及字元數統計。 |
Embedding 詞嵌入 | 標示自訂詞彙向量是示意資料，詞彙類比不是普遍成立的規則。 |
CNN 卷積層 | 說明濾鏡響應的負值也可能有意義。 |
CNN 池化層 | 修正池化必然避免過擬合、平均池化較少使用的說法。 |
Q-Learning | 修正地圖初始隨機的錯誤描述；此示範的地圖固定，探索動作有隨機性。 |

驗證：23 個 HTML 檔的本地資源連結存在；22 個 `script.js` 通過 `node --check`；分詞器的 BPE 示範模式與字元模式均能將 emoji 保留為單一字元。`node tests/teaching-math.test.js` 驗證目標編碼平均值與 Swish 導數，並以模擬 DOM 核對目標編碼的預設資料、自訂資料及清除流程。外部影片、字型及 CDN 是否可連線，取決於使用者網路環境。

## 後續新增課程

依學習路徑新增七頁：[資料分割](DataSplit/index.html)、[反向傳播](Backprop/index.html)、[注意力機制](Attention/index.html)、[隨機森林](RandomForest/index.html)、[類別不平衡](Imbalance/index.html)、[模型公平性](Fairness/index.html)、[預測下一個 Token](NextToken/index.html)。各頁均有參數操作、即時計算結果與示意資料說明。新增後共 29 個主題頁。

`node tests/new-lessons.test.js` 已檢查七頁的初始化與主要控制流程；全站 30 個 HTML 檔的本地連結與 ID 亦已檢查。瀏覽器工具拒絕開啟本機 `file:` 頁面，因此尚未完成真實瀏覽器版面驗證。
