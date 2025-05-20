import JSZip from 'jszip';

async function fetchAndExtractJSON(zipUrl: string) {
    try {
      // 1. 獲取ZIP檔案
      console.log('開始下載ZIP檔案...');
      const response = await fetch(zipUrl);
      const zipData = await response.arrayBuffer();
      console.log('ZIP檔案下載完成');
      
      // 2. 使用JSZip解壓縮
      console.log('開始解壓縮...');
      const zip = new JSZip();
      const extractedZip = await zip.loadAsync(zipData);
      console.log('解壓縮完成，檔案列表：', Object.keys(extractedZip.files));
      
      // 3. 尋找並讀取JSON檔案
      const jsonFiles = {};
      
      // 處理所有檔案
      const filePromises = [];
      extractedZip.forEach((relativePath, zipEntry) => {
        // 只處理JSON檔案且不是目錄
        if (relativePath.endsWith('.json') && !zipEntry.dir) {
          const promise = zipEntry.async('text').then(content => {
            console.log(`讀取檔案: ${relativePath}`);
            try {
              // 解析JSON內容
              const jsonData = JSON.parse(content);
              jsonFiles[relativePath] = jsonData;
            } catch (error) {
              console.error(`解析JSON失敗: ${relativePath}`, error);
              jsonFiles[relativePath] = content; // 保存原始內容
            }
          });
          filePromises.push(promise);
        }
      });
      
      // 等待所有檔案處理完成
      await Promise.all(filePromises);
      
      console.log('所有JSON檔案已解析完畢', jsonFiles);
      return jsonFiles;
    } catch (error) {
      console.error('處理過程中發生錯誤:', error);
      throw error;
    }
  }
  
  // 使用方法
  const zipUrl = 'https://data.moi.gov.tw/MoiOD/System/DownloadFile.aspx?DATA=B19700FB-2169-43E8-B550-92168B76EF68';
  
  fetchAndExtractJSON(zipUrl)
    .then(jsonFiles => {
      // 現在您可以使用解壓出來的JSON檔案進行開發
      console.log('可以使用的JSON數據:', jsonFiles);
      
      // 示例：使用第一個JSON檔案
      const firstJsonFile = Object.values(jsonFiles)[0];
      if (firstJsonFile) {
        console.log('第一個JSON檔案的內容:', firstJsonFile);
        // 這裡可以進行您的開發工作
        // 例如：更新UI、資料處理等
      }
    })
    .catch(error => {
      console.error('最終錯誤:', error);
    });