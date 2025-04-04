import { default as dataExporter, files } from '@/utils/dataExporter';
import BrowserAPIService from '@/service/browser-api/BrowserAPIService';

function blobToBase64(blob) {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result);
    reader.readAsDataURL(blob);
  });
}

async function exportData({ data, id }, { refData }) {
  const dataToExport = data.dataToExport || 'data-columns';
  let payload = refData.table;

  if (dataToExport === 'google-sheets') {
    payload = refData.googleSheets[data.refKey] || [];
  } else if (dataToExport === 'variable') {
    payload = refData.variables[data.variableName] || [];

    if (!Array.isArray(payload)) {
      payload = [payload];

      if (data.type === 'csv' && typeof payload[0] !== 'object')
        payload = [payload];
    }
  }

  const isDOMAvailable = typeof document !== 'undefined';
  let blobUrl = dataExporter(payload, {
    ...data,
    csvOptions: {
      delimiter: data.csvDelimiter || ',',
    },
    returnUrl: !isDOMAvailable,
  });

  const hasDownloadAccess =
    !isDOMAvailable &&
    (await BrowserAPIService.permissions.contains({
      permissions: ['downloads'],
    }));
  if (hasDownloadAccess) {
    blobUrl = await blobToBase64(blobUrl);

    const filename = `${data.name || 'unnamed'}${files[data.type].ext}`;
    const options = {
      filename,
      conflictAction: data.onConflict || 'uniquify',
    };

    await BrowserAPIService.downloads.download({
      ...options,
      url: blobUrl,
    });
  }

  return {
    data: '',
    nextBlockId: this.getBlockConnections(id),
  };
}

export default exportData;
