// ============================================================
//  Painel de Atalhos DHL – Backend Google Apps Script
// ============================================================
//  COMO INSTALAR:
//  1. Abra ou crie uma planilha Google Sheets
//  2. Acesse: Extensões → Apps Script
//  3. Apague o código de exemplo e cole TODO este arquivo
//  4. Salve (Ctrl+S)
//  5. Clique em "Implantar" → "Nova implantação"
//  6. Tipo: Aplicativo da Web
//     Executar como: Eu
//     Quem tem acesso: Qualquer pessoa
//  7. Clique em Implantar, autorize as permissões
//  8. COPIE o URL gerado e cole no app (tela de Configurações)
// ============================================================

const SHEET_NAME = 'atalhos';
const COLUMNS    = ['id', 'name', 'url', 'type', 'time'];

// ── Roteador principal ────────────────────────────────────────
function doGet(e) {
  try {
    const action = (e.parameter && e.parameter.action) || 'getAll';
    if (action === 'getAll') return jsonOk(getAll());
    if (action === 'put')    return jsonOk(putItem(JSON.parse(e.parameter.item)));
    if (action === 'delete') return jsonOk(deleteItem(e.parameter.id));
    return jsonOk({ error: 'Ação desconhecida.' });
  } catch (err) {
    return jsonOk({ error: err.message });
  }
}

function jsonOk(data) {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

// ── Helpers de planilha ───────────────────────────────────────
function getSheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_NAME);
    sheet.appendRow(COLUMNS);
    sheet.setFrozenRows(1);
    sheet.getRange(1, 1, 1, COLUMNS.length).setFontWeight('bold');
  }
  return sheet;
}

// ── CRUD ──────────────────────────────────────────────────────
function getAll() {
  const sheet = getSheet();
  const rows  = sheet.getDataRange().getValues();
  if (rows.length <= 1) return [];
  const headers = rows[0];
  return rows.slice(1).map(row => {
    const item = {};
    headers.forEach((h, i) => { item[h] = row[i]; });
    return item;
  });
}

function putItem(item) {
  const sheet = getSheet();
  const rows  = sheet.getDataRange().getValues();
  for (let i = 1; i < rows.length; i++) {
    if (String(rows[i][0]) === String(item.id)) {
      COLUMNS.forEach((col, j) => sheet.getRange(i + 1, j + 1).setValue(item[col] ?? ''));
      return { success: true };
    }
  }
  sheet.appendRow(COLUMNS.map(col => item[col] ?? ''));
  return { success: true };
}

function deleteItem(id) {
  const sheet = getSheet();
  const rows  = sheet.getDataRange().getValues();
  for (let i = 1; i < rows.length; i++) {
    if (String(rows[i][0]) === String(id)) {
      sheet.deleteRow(i + 1);
      return { success: true };
    }
  }
  return { error: 'Item não encontrado.' };
}
