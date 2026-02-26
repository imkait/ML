# 🤖 高雄市立楠梓高中 AI 人工智慧互動教學平台

此專案為**高雄市立楠梓高中**所開發的線上教學網站，旨在透過**視覺化**與**互動式**的網頁介面，幫助學生輕鬆學習與理解機器學習與人工智慧的各種核心演算法與概念。

🔗 **線上教學網站入口**：[https://imkait.github.io/ML](https://imkait.github.io/ML)

## 🌟 專案特色

- **純前端實作**：使用基礎 HTML, CSS, JavaScript 構建，無需複雜的後端環境設定。
- **互動式視覺化**：將抽象的數學與演算法邏輯，轉化為直覺的圖表與動畫，讓學生能動手調整參數並即時看到變化。
- **循序漸進的課程結構**：涵蓋從最基本的資料預處理、傳統機器學習模型，一路延伸到進階的神經網路與深度學習技術。

## 📚 課程單元目錄

### 1. 資料預處理 (Data Preprocessing)
- **[特徵縮放 (Feature Scaling)](FeatureScaling/index.html)** - 將不同量綱的特徵轉換至相同尺度，提升模型學習效果。
- **[類別編碼 (Categorical Encoding)](CgEncoding/index.html)** - 將文字型態的類別特徵轉換為數值，讓模型能夠理解。
- **[資料降維 (Dimensionality Reduction)](DimenRedu/index.html)** - 將高維資料壓縮成低維，保留最重要的特徵資訊。

### 2. 基礎核心與回歸 (Foundations & Regression)
- **[梯度下降法 (Gradient Descent)](GradientDescent/index.html)** - 透過等高線視覺化機器學習的核心優化方法，找尋損失函數最小值。
- **[線性回歸 (Linear Regression)](LinearRegration/index.html)** - 找出最佳擬合直線，預測連續數值，並觀察誤差變化。
- **[邏輯回歸 (Logistic Regression)](LogisticRegression/index.html)** - 使用 Sigmoid 函數進行二元分類預測的基礎模型。

### 3. 監督式學習演算法 (Supervised Learning)
- **[K-最近鄰演算法 (KNN)](KNN/index.html)** - 透過「近朱者赤」的距離概念，根據鄰近點分佈進行分類。
- **[決策樹 (Decision Tree)](DecisionTree/index.html)** - 透過樹狀結構與條件分支進行決策判斷與分類。
- **[支援向量機 (SVM)](SVM/index.html)** - 尋找最佳超平面，以最大化邊界的方式實現高維度分類。

### 4. 非監督式學習與降維 (Unsupervised Learning)
- **[K-Means 分群](KMeans/index.html)** - 無監督式學習經典算法，自動將資料分成 K 個不同的群集。
- **[主成分分析 (PCA)](PCA/index.html)** - 透過旋轉與投影，找出數據變異數最大的方向進行降維。

### 5. 模型評估與概念 (Model Evaluation)
- **[過擬合與欠擬合 (Overfitting & Underfitting)](FIT/index.html)** - 探索模型複雜度與泛化能力的平衡點。
- **[正規化 (L1/L2 Regularization)](L1L2/index.html)** - 透過懲罰項抑制模型複雜度，藉此解決過擬合問題。
- **[混淆矩陣與指標 (Confusion Matrix)](Matrix/index.html)** - 深入理解評估模型常用的 Accuracy, Precision, Recall 與 F1-Score 指標。

### 6. 深度學習基礎 (Deep Learning Foundations)
- **[激活函數 (Activation Functions)](ActFun/index.html)** - 了解神經網路中常用的非線性激活函數及其特性。
- **[損失函數 (Loss Functions)](LossFun/index.html)** - 評估模型預測結果誤差的各種損失函數比較。
- **[多層感知器 (MLP)](MLP/index.html)** - 探索前饋神經網路的基礎架構與前向傳播機制。
- **[Tokenizer 分詞器](Token/index.html)** - 了解大型語言模型 (LLM) 如何將文字切割成 Token 進行處理。
- **[Embedding 詞嵌入](Embedding/index.html)** - 將文字轉換成包含語意關係的數值向量。

### 7. 進階視覺模型 (Advanced Vision Models)
- **[CNN 卷積層 (Convolutional Neural Network)](CNN/index.html)** - 視覺化卷積運算過程，了解電腦如何「看見」圖像特徵。
- **[CNN 池化層 (Pooling Layer)](CNN_Pooling/index.html)** - 透過最大池化 (Max Pooling) 或平均池化 (Mean Pooling) 提取關鍵資訊並降維。

### 8. 強化學習 (Reinforcement Learning)
- **[Q-Learning](RLearning/index.html)** - 訓練智能體 (Agent) 在網格世界中持續探索並尋找抵達目標的最佳路徑。

## 🚀 如何在本地端使用
這是一個純靜態網頁應用，不依賴任何特定的程式語言後端環境：
1. 將整個專案資料夾下載至本地端。
2. 使用瀏覽器直接開啟根目錄下的 `index.html` 檔案。
3. 或是使用 VS Code 套件 `Live Server` 啟動，獲得更佳的瀏覽體驗。

## 👨‍🏫 給學生的挑戰與建議
所有可調整的拉桿與按鈕，都是為了幫助您了解演算法內部的機制。建議您在研讀各單元的原理後，動手改變參數（如學習率、隱藏層節點數、K值大小等），並觀察結果出現了什麼樣的變化。

---
*專案持續更新與維護中，若您在學習上有任何疑問，歡迎隨時透過課程教學社群提出討論！*
