/**
 * ====================================================================================
 * ระบบเช็คอุปกรณ์ประจำรถพยาบาล หน่วยกู้ชีพเทศบาลเมืองพันท้ายนรสิงห์
 * Ambulance Equipment Checklist System - Panthai Norasingh Municipality EMS
 * ====================================================================================
 * Google Apps Script Backend (Code.gs)
 * Version: 4.0 (Morning & Night Shifts per Day, Dropdown Month, Bottom Checker Row)
 * ====================================================================================
 */

// 1. Web App Entry Points (Supports GAS Web App & External GitHub Pages API)
function doGet(e) {
  if (e && e.parameter && e.parameter.action) {
    var action = e.parameter.action;
    var result = {};
    if (action === 'ping') {
      result = { success: true, message: 'Google Apps Script API พร้อมเชื่อมต่อกับเว็บไซต์ GitHub Pages แล้ว!', timestamp: new Date().toISOString() };
    } else if (action === 'getEquipment') {
      result = getEquipmentList();
    } else if (action === 'initSheets') {
      result = initSheets();
    } else {
      result = { success: true, message: 'API Endpoint Active' };
    }
    return ContentService.createTextOutput(JSON.stringify(result))
      .setMimeType(ContentService.MimeType.JSON);
  }

  var template = HtmlService.createTemplateFromFile('index');
  return template.evaluate()
    .setTitle('ระบบเช็คอุปกรณ์ประจำรถพยาบาล - หน่วยกู้ชีพเทศบาลเมืองพันท้ายนรสิงห์')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

function doPost(e) {
  try {
    var contents = (e && e.postData && e.postData.contents) ? e.postData.contents : '{}';
    var params = JSON.parse(contents);
    var action = params.action;
    var result = {};

    switch (action) {
      case 'ping':
        result = { success: true, message: 'Google Apps Script API พร้อมเชื่อมต่อ!' };
        break;
      case 'login':
        result = loginUser(params.username, params.password);
        break;
      case 'register':
        result = registerUser(params.userData);
        break;
      case 'changePassword':
        result = changePassword(params.userId, params.oldPassword, params.newPassword);
        break;
      case 'approveUser':
        result = approveUser(params.adminId, params.targetUserId, params.status);
        break;
      case 'getUsersList':
        result = getUsersList(params.adminId);
        break;
      case 'saveChecklist':
        result = saveChecklistBatch(params.checkData);
        break;
      case 'getHistory':
        result = getChecklistHistory(params.filters);
        break;
      case 'getEquipment':
        result = getEquipmentList();
        break;
      case 'addEquipment':
        result = addNewEquipment(params.equipmentData);
        break;
      case 'getDashboardStats':
        result = getDashboardStats(params.month, params.year);
        break;
      case 'initSheets':
        result = initSheets();
        break;
      default:
        result = { success: false, message: 'Invalid action: ' + action };
    }

    return ContentService.createTextOutput(JSON.stringify(result))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({
      success: false,
      message: 'Server Error: ' + err.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

// -----------------------------------------------------------------------------
// Sheet Configuration & Initialization
// -----------------------------------------------------------------------------
var VEHICLE_SHEETS = ['กข9745', 'กค7080', 'กง3002'];
var SHEET_LOGS = 'CheckLogs';
var SHEET_USERS = 'Users';
var SHEET_EQUIPMENT = 'EquipmentMaster';
var SHEET_SETTINGS = 'Settings';

// Thai Months List for Dropdown
var THAI_MONTHS = [
  'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
  'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'
];

// Default 40 Checklist Items
var DEFAULT_EQUIPMENT = [
  { id: 1, name: 'สัญญาณไฟฉุกเฉิน', standard: 'พร้อมใช้งาน', category: 'ระบบไฟและตัวรถ' },
  { id: 2, name: 'ไฟส่องสว่าง/เลี้ยวซ้ายขวา', standard: 'พร้อมใช้งาน', category: 'ระบบไฟและตัวรถ' },
  { id: 3, name: 'ไฟฉาย', standard: 'พร้อมใช้งาน', category: 'ระบบไฟและตัวรถ' },
  { id: 4, name: 'ลมยาง', standard: 'พร้อมใช้งาน (ไม่อ่อน)', category: 'ระบบไฟและตัวรถ' },
  { id: 5, name: 'น้ำกลั่น/ทุกวันจันทร์', standard: 'ระดับปกติ', category: 'ระบบเครื่องยนต์' },
  { id: 6, name: 'น้ำมันเชื้อเพลิงไม่ต่ำกว่า', standard: '1/2 ถัง', category: 'ระบบเครื่องยนต์' },
  { id: 7, name: 'ทูนิเก้ (Tourniquet)', standard: 'พร้อมใช้งาน', category: 'อุปกรณ์ห้ามเลือดและแผล' },
  { id: 8, name: 'เสื้อสะท้อนแสง', standard: 'พร้อมใช้งาน', category: 'อุปกรณ์ความปลอดภัย' },
  { id: 9, name: 'รองเท้าบูธ 2 คู่', standard: '2 คู่', category: 'อุปกรณ์ความปลอดภัย' },
  { id: 10, name: 'ระบบแอร์', standard: 'เย็นปกติ', category: 'ระบบในห้องโดยสาร' },
  { id: 11, name: 'กระเป๋าพยาบาลพร้อมอุปกรณ์', standard: 'พอใช้ (ครบชุด)', category: 'ชุดปฐมพยาบาล' },
  { id: 12, name: 'Hard Collar', standard: '3 ชิ้น', category: 'อุปกรณ์ดามกระดูกและคอ' },
  { id: 13, name: 'กรรไกร', standard: 'พร้อมใช้งาน', category: 'อุปกรณ์ห้ามเลือดและแผล' },
  { id: 14, name: 'ไม้ดามแขน', standard: '4 ชิ้น', category: 'อุปกรณ์ดามกระดูกและคอ' },
  { id: 15, name: 'ไม้ดามขา', standard: '4 ชิ้น', category: 'อุปกรณ์ดามกระดูกและคอ' },
  { id: 16, name: 'เฝือกลม', standard: 'พร้อมใช้งาน', category: 'อุปกรณ์ดามกระดูกและคอ' },
  { id: 17, name: 'ชุด Spinalboard พร้อมสายรัด', standard: 'พร้อมใช้งาน', category: 'อุปกรณ์เคลื่อนย้าย' },
  { id: 18, name: 'Stretcher', standard: 'พร้อมใช้งาน', category: 'อุปกรณ์เคลื่อนย้าย' },
  { id: 19, name: 'Stretcher เก้าอี้นั่ง', standard: 'พร้อมใช้งาน', category: 'อุปกรณ์เคลื่อนย้าย' },
  { id: 20, name: 'KED', standard: 'พร้อมใช้งาน', category: 'อุปกรณ์ดามกระดูกและคอ' },
  { id: 21, name: 'Cannula ผู้ใหญ่/เด็ก', standard: '3 ชุด', category: 'อุปกรณ์ออกซิเจนและทางเดินหายใจ' },
  { id: 22, name: 'Maskwithbag/ผู้ใหญ่', standard: '3 ชุด', category: 'อุปกรณ์ออกซิเจนและทางเดินหายใจ' },
  { id: 23, name: 'Maskwithbag/เด็ก', standard: '3 ชุด', category: 'อุปกรณ์ออกซิเจนและทางเดินหายใจ' },
  { id: 24, name: 'เครื่องกระตุ้นหัวใจ/สายสัญญาณ', standard: 'พร้อมใช้งาน/แบตเต็ม', category: 'เครื่องมือแพทย์ฉุกเฉิน' },
  { id: 25, name: 'Ambu Bag', standard: 'พอใช้ (พร้อมใช้)', category: 'อุปกรณ์ออกซิเจนและทางเดินหายใจ' },
  { id: 26, name: 'Oral air way เล็ก', standard: 'พร้อมใช้งาน', category: 'อุปกรณ์ออกซิเจนและทางเดินหายใจ' },
  { id: 27, name: 'Oral air way กลาง', standard: 'พร้อมใช้งาน', category: 'อุปกรณ์ออกซิเจนและทางเดินหายใจ' },
  { id: 28, name: 'Oral air way ใหญ่', standard: 'พร้อมใช้งาน', category: 'อุปกรณ์ออกซิเจนและทางเดินหายใจ' },
  { id: 29, name: 'เครื่อง Suction Mobile', standard: 'พร้อมใช้งาน/แบตเต็ม', category: 'เครื่องมือแพทย์ฉุกเฉิน' },
  { id: 30, name: 'เครื่องวัด BP ติดรถยนต์', standard: 'พร้อมใช้งาน', category: 'เครื่องมือแพทย์ฉุกเฉิน' },
  { id: 31, name: 'เครื่องวัด BP Digital', standard: 'พร้อมใช้งาน', category: 'เครื่องมือแพทย์ฉุกเฉิน' },
  { id: 32, name: 'เครื่องวัดออกซิเจน Sat Mobile', standard: 'พร้อมใช้งาน', category: 'เครื่องมือแพทย์ฉุกเฉิน' },
  { id: 33, name: 'สาย Suction', standard: 'พอใช้ (มีสำรอง)', category: 'อุปกรณ์ออกซิเจนและทางเดินหายใจ' },
  { id: 34, name: 'ถุงมือ Dispose', standard: 'พอใช้ (มีเพียงพอ)', category: 'อุปกรณ์ป้องกันส่วนบุคคล' },
  { id: 35, name: 'เครื่องเจาะ DTX', standard: '1 เครื่อง (แผ่นตรวจพร้อม)', category: 'เครื่องมือแพทย์ฉุกเฉิน' },
  { id: 36, name: 'ออกซิเจน No1 ไม่ต่ำกว่า', standard: '500 psi', category: 'ระบบออกซิเจน' },
  { id: 37, name: 'ออกซิเจน No2 ไม่ต่ำกว่า', standard: '500 psi', category: 'ระบบออกซิเจน' },
  { id: 38, name: 'ออกซิเจน No3 ไม่ต่ำกว่า', standard: '500 psi', category: 'ระบบออกซิเจน' },
  { id: 39, name: 'ความสะอาดภายในรถ', standard: 'สะอาดเรียบร้อย', category: 'สุขอนามัยและความสะอาด' },
  { id: 40, name: 'ความสะอาดภายนอกรถ', standard: 'สะอาดเรียบร้อย', category: 'สุขอนามัยและความสะอาด' }
];

// Default Users (Pre-seeded)
var DEFAULT_USERS = [
  { id: 'phantai312', name: 'เจ้าหน้าที่ กู้ชีพ 312', role: 'Staff', position: 'EMT', pass: '123456', mustChange: true, status: 'Approved' },
  { id: 'phantai325', name: 'เจ้าหน้าที่ กู้ชีพ 325', role: 'Staff', position: 'EMT', pass: '123456', mustChange: true, status: 'Approved' },
  { id: 'phantai326', name: 'เจ้าหน้าที่ กู้ชีพ 326', role: 'Staff', position: 'EMT', pass: '123456', mustChange: true, status: 'Approved' },
  { id: 'phantai327', name: 'เจ้าหน้าที่ กู้ชีพ 327', role: 'Staff', position: 'EMT', pass: '123456', mustChange: true, status: 'Approved' },
  { id: 'phantai122', name: 'เจ้าหน้าที่ กู้ชีพ 122', role: 'Staff', position: 'EMR', pass: '123456', mustChange: true, status: 'Approved' },
  { id: 'phantai134', name: 'เจ้าหน้าที่ กู้ชีพ 134', role: 'Staff', position: 'EMR', pass: '123456', mustChange: true, status: 'Approved' },
  { id: 'phantai136', name: 'เจ้าหน้าที่ กู้ชีพ 136', role: 'Staff', position: 'EMR', pass: '123456', mustChange: true, status: 'Approved' },
  { id: 'phantai137', name: 'เจ้าหน้าที่ กู้ชีพ 137', role: 'Staff', position: 'EMR', pass: '123456', mustChange: true, status: 'Approved' },
  { id: 'ems.pantai@gmail.com', name: 'ผู้ดูแลระบบ กู้ชีพพันท้ายนรสิงห์', role: 'Admin', position: 'Administrator', pass: 'ems1669', mustChange: false, status: 'Approved' }
];

/**
 * Format Checker Display Code
 * Extracts numeric suffix e.g. phantai312 -> 312, phantai122 -> 122
 */
function formatCheckerCode(userId) {
  if (!userId) return '-';
  var str = String(userId).trim();
  var match = str.match(/phantai(\d+)/i) || str.match(/(\d+)/);
  if (match) return match[1];
  if (str.indexOf('@') !== -1) return str.split('@')[0];
  return str;
}

/**
 * Initialize Google Sheets Structure Automatically
 */
function initSheets() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  if (!ss) {
    return { success: false, message: 'No active spreadsheet found. Please run within a Google Sheet.' };
  }

  // 1. Create or verify EquipmentMaster Sheet
  var eqSheet = getOrCreateSheet(ss, SHEET_EQUIPMENT, '#0284c7');
  if (eqSheet.getLastRow() < 2) {
    eqSheet.clear();
    var eqHeaders = ['รหัสอุปกรณ์', 'ชื่อรายการอุปกรณ์', 'เกณฑ์/จำนวนมาตรฐาน', 'หมวดหมู่', 'สถานะการใช้งาน', 'วันที่เพิ่ม'];
    eqSheet.appendRow(eqHeaders);
    formatHeaderRow(eqSheet, '#0369a1', '#ffffff');

    var eqRows = DEFAULT_EQUIPMENT.map(function(item) {
      return [item.id, item.name, item.standard, item.category, 'Active', new Date()];
    });
    eqSheet.getRange(2, 1, eqRows.length, 6).setValues(eqRows);
    eqSheet.autoResizeColumns(1, 6);
  }

  // 2. Create or verify Users Sheet
  var userSheet = getOrCreateSheet(ss, SHEET_USERS, '#16a34a');
  if (userSheet.getLastRow() < 2) {
    userSheet.clear();
    var userHeaders = ['User ID / Email', 'ชื่อ-นามสกุล', 'ตำแหน่ง', 'ระดับสิทธิ์ (Role)', 'Password Hash', 'ต้องเปลี่ยนรหัส (MustChangePass)', 'สถานะการอนุมัติ (Status)', 'วันที่สร้าง', 'ผู้อนุมัติ'];
    userSheet.appendRow(userHeaders);
    formatHeaderRow(userSheet, '#15803d', '#ffffff');

    var userRows = DEFAULT_USERS.map(function(u) {
      return [u.id, u.name, u.position, u.role, hashPassword(u.pass), u.mustChange ? 'YES' : 'NO', u.status, new Date(), 'SYSTEM'];
    });
    userSheet.getRange(2, 1, userRows.length, 9).setValues(userRows);
    userSheet.autoResizeColumns(1, 9);
  }

  // 3. Create or verify CheckLogs Sheet (Added Shift Column)
  var logSheet = getOrCreateSheet(ss, SHEET_LOGS, '#7c3aed');
  if (logSheet.getLastRow() < 2) {
    logSheet.clear();
    var logHeaders = ['Log ID', 'วันที่ตรวจเช็ค', 'เวลา', 'เวรปฏิบัติงาน', 'รถพยาบาล', 'รหัสผู้ตรวจ', 'ชื่อผู้ตรวจ', 'ตำแหน่ง', 'ผลรวมความพร้อม (%)', 'รายการไม่พร้อม (รายการ)', 'หมายเหตุภาพรวม', 'ข้อมูลการเช็คทั้งหมด (JSON)'];
    logSheet.appendRow(logHeaders);
    formatHeaderRow(logSheet, '#6d28d9', '#ffffff');
    logSheet.autoResizeColumns(1, 12);
  }

  // 4. Create or verify the 3 Ambulance Sheets (พยาบาลที่3, พยาบาลที่4, พยาบาลที่5)
  VEHICLE_SHEETS.forEach(function(vName, idx) {
    setupVehicleMonthlySheet(ss, vName, idx);
  });

  return { success: true, message: 'สร้างและจัดรูปแบบ Sheet (แยกเวรเช้า/เวรดึก) เรียบร้อยสมบูรณ์!' };
}

/**
 * Setup Monthly Grid Sheet for an Ambulance Vehicle (พยาบาลที่ 3, 4, 5)
 * Structure (Total 65 Columns):
 * - Row 1: Title Banner (Cols 1..65)
 * - Row 2: Month Dropdown (Col B2) + Year (Col C2) + Banner (Cols D2..BM2)
 * - Row 3: Day Headers (Col D3:E3 = วันที่ 1, Col F3:G3 = วันที่ 2, ... Col BL3:BM3 = วันที่ 31)
 * - Row 4: Shift Headers (Col D4=เช้า, Col E4=ดึก, Col F4=เช้า, Col G4=ดึก...)
 * - Rows 5..(4+N): Equipment Items (40 Items)
 * - Row (5+N): BOTTOM ROW - ชื่อผู้ตรวจ (Checker Code: 312, 122, etc. แยกเวรเช้า/ดึก)
 */
function setupVehicleMonthlySheet(ss, sheetName, colorIndex) {
  var colors = ['#dc2626', '#2563eb', '#059669'];
  var headerColor = colors[colorIndex % colors.length];

  var sheet = getOrCreateSheet(ss, sheetName, headerColor);
  
  // Read equipment list from EquipmentMaster
  var eqList = getEquipmentListFromSheet(ss);
  
  sheet.clear();
  var totalCols = 3 + (31 * 2); // 65 columns
  
  // Row 1: Title Banner
  sheet.getRange(1, 1, 1, totalCols).merge()
    .setValue('แบบบันทึกการตรวจเช็คความพร้อมอุปกรณ์ประจำรถ ' + sheetName + ' - หน่วยกู้ชีพเทศบาลเมืองพันท้ายนรสิงห์ (แยกเวรเช้า / เวรดึก)')
    .setFontSize(13).setFontWeight('bold').setFontColor('#ffffff').setBackground(headerColor)
    .setHorizontalAlignment('center').setVerticalAlignment('middle');
  sheet.setRowHeight(1, 38);

  // Row 2: Month Dropdown & Date Info
  sheet.getRange(2, 1).setValue('เลือกเดือน:')
    .setFontWeight('bold').setBackground('#f1f5f9').setHorizontalAlignment('right');

  // Month Dropdown Data Validation in Cell B2
  var now = new Date();
  var currentMonthName = getThaiMonthName(now.getMonth() + 1);
  var monthRule = SpreadsheetApp.newDataValidation()
    .requireValueInList(THAI_MONTHS, true)
    .setAllowInvalid(false)
    .build();
  sheet.getRange(2, 2).setDataValidation(monthRule).setValue(currentMonthName)
    .setFontWeight('bold').setBackground('#ffffff').setHorizontalAlignment('center');

  // Year in Cell C2
  var yearBe = now.getFullYear() + 543;
  sheet.getRange(2, 3).setValue('พ.ศ. ' + yearBe)
    .setFontWeight('bold').setBackground('#f1f5f9').setHorizontalAlignment('center');

  // Header Banner for Days & Shifts (Cols 4..65)
  sheet.getRange(2, 4, 1, 62).merge()
    .setValue('บันทึกผลการตรวจเช็คประจำวัน (วันที่ 1 - 31 แยกเวรเช้า / เวรดึก)')
    .setFontWeight('bold').setBackground('#e2e8f0').setHorizontalAlignment('center');

  // Row 3: Day Header Merged Ranges (e.g. Day 1 across D3:E3, Day 2 across F3:G3...)
  sheet.getRange(3, 1, 1, 3).merge()
    .setValue('ข้อมูลรายการอุปกรณ์')
    .setFontWeight('bold').setBackground('#1e293b').setFontColor('#ffffff')
    .setHorizontalAlignment('center').setVerticalAlignment('middle');

  for (var d = 1; d <= 31; d++) {
    var startCol = 3 + (d - 1) * 2 + 1; // Col 4, 6, 8...
    var dayBg = (d % 2 === 1) ? '#334155' : '#475569';
    sheet.getRange(3, startCol, 1, 2).merge()
      .setValue('วันที่ ' + d)
      .setFontWeight('bold').setBackground(dayBg).setFontColor('#ffffff')
      .setHorizontalAlignment('center').setVerticalAlignment('middle');
  }
  sheet.setRowHeight(3, 26);

  // Row 4: Shift Header Row (ลำดับ, รายการอุปกรณ์, เกณฑ์มาตรฐาน, เช้า, ดึก, เช้า, ดึก...)
  var shiftHeaders = ['ลำดับ', 'รายการอุปกรณ์', 'เกณฑ์/จำนวนมาตรฐาน'];
  for (var d = 1; d <= 31; d++) {
    shiftHeaders.push('เช้า');
    shiftHeaders.push('ดึก');
  }
  sheet.appendRow(shiftHeaders);
  sheet.getRange(4, 1, 1, 3).setBackground('#334155').setFontColor('#ffffff').setFontWeight('bold').setHorizontalAlignment('center');
  
  // Format Shift Header Colors (Morning = amber tint, Night = indigo tint)
  for (var d = 1; d <= 31; d++) {
    var mCol = 3 + (d - 1) * 2 + 1;
    var nCol = mCol + 1;
    sheet.getRange(4, mCol).setBackground('#fef3c7').setFontColor('#92400e').setFontWeight('bold').setHorizontalAlignment('center');
    sheet.getRange(4, nCol).setBackground('#e0e7ff').setFontColor('#3730a3').setFontWeight('bold').setHorizontalAlignment('center');
  }
  sheet.setRowHeight(4, 24);

  // Rows 5..(4+N): Fill Equipment Items
  var itemRows = eqList.map(function(item, i) {
    var row = [i + 1, item.name, item.standard];
    for (var col = 1; col <= 62; col++) {
      row.push(''); // Empty placeholder for daily shift checks
    }
    return row;
  });

  if (itemRows.length > 0) {
    sheet.getRange(5, 1, itemRows.length, totalCols).setValues(itemRows);
    
    // Zebra Striping
    for (var r = 0; r < itemRows.length; r++) {
      var rowNum = 5 + r;
      var bg = (r % 2 === 0) ? '#ffffff' : '#f8fafc';
      sheet.getRange(rowNum, 1, 1, totalCols).setBackground(bg);
    }
  }

  // Row (5 + eqList.length): BOTTOM ROW - ชื่อผู้ตรวจ (Checker Code Row)
  var bottomRowNum = 5 + itemRows.length;
  var bottomRowData = ['-', 'ชื่อ/รหัสผู้ตรวจ (Checker Code)', 'ระบุรหัส'];
  for (var col = 1; col <= 62; col++) {
    bottomRowData.push('');
  }
  sheet.appendRow(bottomRowData);
  sheet.getRange(bottomRowNum, 1, 1, 3).setBackground('#fef08a').setFontWeight('bold').setFontColor('#0f172a').setHorizontalAlignment('center');
  sheet.getRange(bottomRowNum, 4, 1, 62).setBackground('#fef9c3').setFontWeight('bold').setHorizontalAlignment('center');
  sheet.setRowHeight(bottomRowNum, 32);

  // Apply Borders across entire table (Row 3 to bottomRowNum)
  sheet.getRange(3, 1, itemRows.length + 3, totalCols)
    .setBorder(true, true, true, true, true, true, '#cbd5e1', SpreadsheetApp.BorderStyle.SOLID);

  // Set Widths
  sheet.setColumnWidth(1, 50);   // No
  sheet.setColumnWidth(2, 230);  // Name
  sheet.setColumnWidth(3, 160);  // Criteria
  for (var c = 4; c <= totalCols; c++) {
    sheet.setColumnWidth(c, 58); // Shifts (เช้า/ดึก)
  }
}

/**
 * Batch Save Checklist Data
 * High performance single batch operation writes to CheckLogs and updates Ambulance Grid Sheet (by Day & Shift)
 */
function saveChecklistBatch(checkData) {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    if (!ss) return { success: false, message: 'Spreadsheet connection failed.' };

    var vehicle = checkData.vehicle; // 'พยาบาลที่3', 'พยาบาลที่4', 'พยาบาลที่5'
    var dateStr = checkData.date;   // 'YYYY-MM-DD'
    var timeStr = checkData.time || Utilities.formatDate(new Date(), 'GMT+7', 'HH:mm:ss');
    var shift = checkData.shift || 'เวรเช้า'; // 'เวรเช้า' or 'เวรดึก'
    var checkerId = checkData.checkerId;
    var checkerName = checkData.checkerName || checkerId;
    var checkerPosition = checkData.checkerPosition || 'EMT';
    var items = checkData.items || []; // array of { id, name, status: 'Ready'|'Defective', qty, reason }
    var overallNote = checkData.note || '';

    // Calculate Summary
    var totalItems = items.length;
    var readyCount = 0;
    var defectiveItemsList = [];

    items.forEach(function(it) {
      if (it.status === 'Ready' || it.status === 'พร้อมใช้งาน') {
        readyCount++;
      } else {
        defectiveItemsList.push(it.name + (it.reason ? ' (' + it.reason + ')' : ''));
      }
    });

    var readinessPercent = totalItems > 0 ? Math.round((readyCount / totalItems) * 100) : 100;
    var logId = 'CHK-' + Utilities.formatDate(new Date(), 'GMT+7', 'yyyyMMdd-HHmmss') + '-' + (Math.floor(Math.random() * 900) + 100);

    // Format checker display code (e.g. phantai312 -> 312, phantai122 -> 122)
    var checkerDisplayCode = formatCheckerCode(checkerId);

    // 1. Write to CheckLogs (Batch row append)
    var logSheet = getOrCreateSheet(ss, SHEET_LOGS, '#7c3aed');
    logSheet.appendRow([
      logId,
      dateStr,
      timeStr,
      shift,
      vehicle,
      checkerDisplayCode + ' (' + checkerId + ')',
      checkerName,
      checkerPosition,
      readinessPercent + '%',
      defectiveItemsList.join(', ') || '-',
      overallNote,
      JSON.stringify(items)
    ]);

    // 2. Batch Update Vehicle Monthly Grid Sheet
    var vSheet = ss.getSheetByName(vehicle);
    if (!vSheet) {
      setupVehicleMonthlySheet(ss, vehicle, VEHICLE_SHEETS.indexOf(vehicle));
      vSheet = ss.getSheetByName(vehicle);
    }

    if (vSheet) {
      var dateObj = new Date(dateStr);
      var dayNum = isNaN(dateObj.getDate()) ? new Date().getDate() : dateObj.getDate();
      
      // Calculate target column based on Day (1..31) and Shift (เช้า vs ดึก)
      var isNightShift = (shift === 'เวรดึก' || shift === 'ดึก' || shift === 'Night');
      // Col 4 = Day 1 Morning, Col 5 = Day 1 Night, Col 6 = Day 2 Morning...
      var targetCol = 3 + (dayNum - 1) * 2 + (isNightShift ? 2 : 1);

      var lastRow = vSheet.getLastRow();
      
      // Update Checker Code in the BOTTOM ROW of the table for this day & shift
      var bottomCheckerRow = lastRow;
      // Search from bottom up for the checker row
      for (var r = lastRow; r >= 5; r--) {
        var label = String(vSheet.getRange(r, 2).getValue());
        if (label.indexOf('ชื่อ/รหัสผู้ตรวจ') !== -1) {
          bottomCheckerRow = r;
          break;
        }
      }

      // Write numeric code (e.g. 312, 122) to the bottom row!
      vSheet.getRange(bottomCheckerRow, targetCol)
        .setValue(checkerDisplayCode)
        .setFontColor('#0f172a')
        .setFontWeight('bold')
        .setBackground('#fef08a')
        .setHorizontalAlignment('center');

      // Map items by name/id to update item rows (Rows 5 to bottomCheckerRow - 1)
      var numItemRows = bottomCheckerRow - 5;
      if (numItemRows > 0) {
        var namesRange = vSheet.getRange(5, 2, numItemRows, 1).getValues();
        var updateColValues = [];

        for (var r = 0; r < namesRange.length; r++) {
          var rowItemName = namesRange[r][0];
          var matchingCheck = items.find(function(it) {
            return it.name.trim() === rowItemName.trim();
          });

          if (matchingCheck) {
            var val = (matchingCheck.status === 'Ready' || matchingCheck.status === 'พร้อมใช้งาน') 
              ? '✓' + (matchingCheck.qty ? ' (' + matchingCheck.qty + ')' : '')
              : '✗ ' + (matchingCheck.reason || 'ไม่พร้อม');
            updateColValues.push([val]);
          } else {
            updateColValues.push(['']);
          }
        }

        // Single batch update down the shift column!
        vSheet.getRange(5, targetCol, updateColValues.length, 1).setValues(updateColValues);

        // Apply conditional formatting color
        for (var i = 0; i < updateColValues.length; i++) {
          var cellVal = updateColValues[i][0];
          var cell = vSheet.getRange(5 + i, targetCol);
          if (cellVal.indexOf('✓') === 0) {
            cell.setBackground('#dcfce7').setFontColor('#166534'); // Green
          } else if (cellVal.indexOf('✗') === 0) {
            cell.setBackground('#fee2e2').setFontColor('#991b1b'); // Red
          }
        }
      }
    }

    return {
      success: true,
      logId: logId,
      shift: shift,
      checkerCode: checkerDisplayCode,
      readinessPercent: readinessPercent,
      defectiveCount: defectiveItemsList.length,
      message: 'บันทึกข้อมูลการตรวจเช็ค ' + vehicle + ' (' + shift + ') เรียบร้อยแล้ว โดยผู้ตรวจ ' + checkerDisplayCode + ' (ความพร้อม ' + readinessPercent + '%)'
    };
  } catch (err) {
    return { success: false, message: 'เกิดข้อผิดพลาดในการบันทึก: ' + err.toString() };
  }
}

/**
 * Authentication - Login User
 */
function loginUser(username, password) {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    if (!ss) return { success: false, message: 'Spreadsheet not found' };

    var userSheet = ss.getSheetByName(SHEET_USERS);
    if (!userSheet) {
      initSheets();
      userSheet = ss.getSheetByName(SHEET_USERS);
    }

    var data = userSheet.getDataRange().getValues();
    if (data.length < 2) return { success: false, message: 'ไม่พบข้อมูลผู้ใช้งานในระบบ' };

    var inputHash = hashPassword(password);
    var cleanUser = String(username).trim().toLowerCase();

    for (var i = 1; i < data.length; i++) {
      var dbUserId = String(data[i][0]).trim().toLowerCase();
      var dbName = data[i][1];
      var dbPosition = data[i][2];
      var dbRole = data[i][3];
      var dbPassHash = data[i][4];
      var dbMustChange = String(data[i][5]).toUpperCase() === 'YES';
      var dbStatus = data[i][6];

      if (dbUserId === cleanUser) {
        if (dbStatus !== 'Approved') {
          return {
            success: false,
            message: 'บัญชีผู้ใช้งานนี้ยังไม่ได้รับการอนุมัติจากผู้ดูแลระบบ กรุณารอการอนุมัติ'
          };
        }

        if (dbPassHash === inputHash || dbPassHash === password /* fallback */) {
          return {
            success: true,
            user: {
              id: data[i][0],
              displayCode: formatCheckerCode(data[i][0]),
              name: dbName,
              position: dbPosition,
              role: dbRole,
              mustChangePassword: dbMustChange
            },
            message: 'เข้าสู่ระบบสำเร็จ'
          };
        } else {
          return { success: false, message: 'รหัสผ่านไม่ถูกต้อง กรุณาลองใหม่อีกครั้ง' };
        }
      }
    }

    return { success: false, message: 'ไม่พบบัญชีผู้ใช้งานนี้ในระบบ' };
  } catch (err) {
    return { success: false, message: 'เกิดข้อผิดพลาดในการเข้าสู่ระบบ: ' + err.toString() };
  }
}

/**
 * Change Password (e.g. forced first login change)
 */
function changePassword(userId, oldPassword, newPassword) {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var userSheet = ss.getSheetByName(SHEET_USERS);
    if (!userSheet) return { success: false, message: 'Users sheet not found' };

    var data = userSheet.getDataRange().getValues();
    var cleanUser = String(userId).trim().toLowerCase();
    var oldHash = hashPassword(oldPassword);
    var newHash = hashPassword(newPassword);

    for (var i = 1; i < data.length; i++) {
      var dbUserId = String(data[i][0]).trim().toLowerCase();
      if (dbUserId === cleanUser) {
        var dbPassHash = data[i][4];
        if (dbPassHash !== oldHash && dbPassHash !== oldPassword) {
          return { success: false, message: 'รหัสผ่านเดิมไม่ถูกต้อง' };
        }

        // Update password and set mustChange to NO
        var rowNum = i + 1;
        userSheet.getRange(rowNum, 5).setValue(newHash);
        userSheet.getRange(rowNum, 6).setValue('NO');

        return { success: true, message: 'เปลี่ยนรหัสผ่านใหม่เรียบร้อยแล้ว!' };
      }
    }

    return { success: false, message: 'ไม่พบผู้ใช้ที่ระบุ' };
  } catch (err) {
    return { success: false, message: 'Error changing password: ' + err.toString() };
  }
}

/**
 * Register New User (Pending Approval State)
 */
function registerUser(userData) {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var userSheet = getOrCreateSheet(ss, SHEET_USERS, '#16a34a');
    var data = userSheet.getDataRange().getValues();

    var cleanId = String(userData.id).trim().toLowerCase();
    
    // Check duplicate
    for (var i = 1; i < data.length; i++) {
      if (String(data[i][0]).trim().toLowerCase() === cleanId) {
        return { success: false, message: 'รหัสผู้ใช้งานหรืออีเมลนี้มีอยู่ในระบบแล้ว' };
      }
    }

    userSheet.appendRow([
      userData.id,
      userData.name,
      userData.position || 'EMT',
      userData.role || 'Staff',
      hashPassword(userData.password || '123456'),
      'YES', // Must change password on first login
      'Pending', // Default status waiting for admin approval
      new Date(),
      '-'
    ]);

    return {
      success: true,
      message: 'ลงทะเบียนสำเร็จ! กรุณารอผู้ดูแลระบบตรวจสอบและอนุมัติบัญชีก่อนเข้าสู่ระบบ'
    };
  } catch (err) {
    return { success: false, message: 'Error in registration: ' + err.toString() };
  }
}

/**
 * Admin: Approve / Reject User
 */
function approveUser(adminId, targetUserId, status) {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var userSheet = ss.getSheetByName(SHEET_USERS);
    var data = userSheet.getDataRange().getValues();

    for (var i = 1; i < data.length; i++) {
      if (String(data[i][0]).trim().toLowerCase() === String(targetUserId).trim().toLowerCase()) {
        var rowNum = i + 1;
        userSheet.getRange(rowNum, 7).setValue(status); // Approved or Rejected
        userSheet.getRange(rowNum, 9).setValue(adminId || 'Admin');
        return { success: true, message: 'อัปเดตสถานะผู้ใช้ ' + targetUserId + ' เป็น ' + status + ' เรียบร้อยแล้ว' };
      }
    }
    return { success: false, message: 'ไม่พบผู้ใช้ที่ต้องการอนุมัติ' };
  } catch (err) {
    return { success: false, message: 'Error approving user: ' + err.toString() };
  }
}

/**
 * Admin: Get List of Users
 */
function getUsersList(adminId) {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var userSheet = ss.getSheetByName(SHEET_USERS);
    if (!userSheet) return { success: false, users: [] };

    var data = userSheet.getDataRange().getValues();
    var users = [];
    for (var i = 1; i < data.length; i++) {
      users.push({
        id: data[i][0],
        displayCode: formatCheckerCode(data[i][0]),
        name: data[i][1],
        position: data[i][2],
        role: data[i][3],
        mustChangePassword: data[i][5] === 'YES',
        status: data[i][6],
        createdAt: data[i][7] ? Utilities.formatDate(new Date(data[i][7]), 'GMT+7', 'yyyy-MM-dd HH:mm') : '-',
        approvedBy: data[i][8] || '-'
      });
    }
    return { success: true, users: users };
  } catch (err) {
    return { success: false, message: err.toString(), users: [] };
  }
}

/**
 * Dynamic Equipment Management: Add New Equipment
 * Inserts new equipment row BEFORE the bottom checker row in all 3 vehicle sheets!
 */
function addNewEquipment(equipmentData) {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var eqSheet = getOrCreateSheet(ss, SHEET_EQUIPMENT, '#0284c7');

    var nextId = eqSheet.getLastRow(); // row count as ID
    var newRow = [
      nextId,
      equipmentData.name,
      equipmentData.standard || 'พร้อมใช้งาน',
      equipmentData.category || 'ทั่วไป',
      'Active',
      new Date()
    ];

    eqSheet.appendRow(newRow);

    // Insert this new equipment row before the bottom checker row in all 3 vehicle sheets
    VEHICLE_SHEETS.forEach(function(vName) {
      var vSheet = ss.getSheetByName(vName);
      if (vSheet) {
        var lastRow = vSheet.getLastRow();
        var bottomCheckerRow = lastRow;

        for (var r = lastRow; r >= 5; r--) {
          var label = String(vSheet.getRange(r, 2).getValue());
          if (label.indexOf('ชื่อ/รหัสผู้ตรวจ') !== -1) {
            bottomCheckerRow = r;
            break;
          }
        }

        // Insert new row before bottomCheckerRow
        vSheet.insertRowBefore(bottomCheckerRow);
        
        var emptyShifts = [];
        for (var c = 1; c <= 62; c++) emptyShifts.push('');
        var rowData = [nextId, equipmentData.name, equipmentData.standard || 'พร้อมใช้งาน'].concat(emptyShifts);
        
        vSheet.getRange(bottomCheckerRow, 1, 1, rowData.length).setValues([rowData]);
      }
    });

    return {
      success: true,
      item: {
        id: nextId,
        name: equipmentData.name,
        standard: equipmentData.standard || 'พร้อมใช้งาน',
        category: equipmentData.category || 'ทั่วไป'
      },
      message: 'เพิ่มอุปกรณ์ใหม่ "' + equipmentData.name + '" เข้าระบบและชีทรถทั้ง 3 คันเรียบร้อยแล้ว!'
    };
  } catch (err) {
    return { success: false, message: 'Error adding equipment: ' + err.toString() };
  }
}

/**
 * Fetch Equipment List
 */
function getEquipmentList() {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var list = getEquipmentListFromSheet(ss);
    return { success: true, items: list };
  } catch (err) {
    return { success: false, items: DEFAULT_EQUIPMENT, message: err.toString() };
  }
}

function getEquipmentListFromSheet(ss) {
  var eqSheet = ss.getSheetByName(SHEET_EQUIPMENT);
  if (!eqSheet || eqSheet.getLastRow() < 2) {
    return DEFAULT_EQUIPMENT;
  }

  var data = eqSheet.getDataRange().getValues();
  var list = [];
  for (var i = 1; i < data.length; i++) {
    if (data[i][4] === 'Active' || data[i][4] === '') {
      list.push({
        id: data[i][0],
        name: data[i][1],
        standard: data[i][2],
        category: data[i][3] || 'ทั่วไป'
      });
    }
  }
  return list.length > 0 ? list : DEFAULT_EQUIPMENT;
}

/**
 * Fetch Inspection History with Filters
 */
function getChecklistHistory(filters) {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var logSheet = ss.getSheetByName(SHEET_LOGS);
    if (!logSheet || logSheet.getLastRow() < 2) {
      return { success: true, history: [] };
    }

    var data = logSheet.getDataRange().getValues();
    var history = [];

    var vehicleFilter = filters && filters.vehicle ? filters.vehicle : '';
    var startDate = filters && filters.startDate ? new Date(filters.startDate) : null;
    var endDate = filters && filters.endDate ? new Date(filters.endDate) : null;

    for (var i = 1; i < data.length; i++) {
      var logDate = new Date(data[i][1]);
      var shiftVal = data[i][3];
      var vName = data[i][4];

      if (vehicleFilter && vehicleFilter !== 'All' && vName !== vehicleFilter) {
        continue;
      }
      if (startDate && logDate < startDate) {
        continue;
      }
      if (endDate && logDate > endDate) {
        continue;
      }

      history.push({
        logId: data[i][0],
        date: data[i][1] instanceof Date ? Utilities.formatDate(data[i][1], 'GMT+7', 'yyyy-MM-dd') : data[i][1],
        time: data[i][2],
        shift: shiftVal || 'เวรเช้า',
        vehicle: data[i][4],
        checkerId: data[i][5],
        checkerName: data[i][6],
        checkerPosition: data[i][7],
        readinessPercent: data[i][8],
        defectiveSummary: data[i][9],
        notes: data[i][10],
        items: data[i][11] ? JSON.parse(data[i][11]) : []
      });
    }

    // Sort newest first
    history.reverse();

    return { success: true, history: history };
  } catch (err) {
    return { success: false, message: 'Error fetching history: ' + err.toString(), history: [] };
  }
}

/**
 * Dashboard Analytics & Stats
 */
function getDashboardStats(month, year) {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var logSheet = ss.getSheetByName(SHEET_LOGS);
    var stats = {
      totalChecks: 0,
      v9745Checks: 0,
      v7080Checks: 0,
      v3002Checks: 0,
      avgReadiness: 100,
      defectiveAlerts: [],
      recentLogs: []
    };

    if (!logSheet || logSheet.getLastRow() < 2) {
      return { success: true, stats: stats };
    }

    var data = logSheet.getDataRange().getValues();
    var sumPercent = 0;

    for (var i = 1; i < data.length; i++) {
      var vName = data[i][4];
      var pct = parseInt(data[i][8], 10) || 100;
      var defect = data[i][9];

      stats.totalChecks++;
      if (vName === 'กข9745' || vName === 'พยาบาลที่3') stats.v9745Checks++;
      if (vName === 'กค7080' || vName === 'พยาบาลที่4') stats.v7080Checks++;
      if (vName === 'กง3002' || vName === 'พยาบาลที่5') stats.v3002Checks++;

      sumPercent += pct;

      if (defect && defect !== '-') {
        stats.defectiveAlerts.push({
          date: data[i][1] instanceof Date ? Utilities.formatDate(data[i][1], 'GMT+7', 'dd/MM/yyyy') : data[i][1],
          vehicle: vName,
          checker: data[i][5],
          defect: defect
        });
      }
    }

    stats.avgReadiness = stats.totalChecks > 0 ? Math.round(sumPercent / stats.totalChecks) : 100;
    return { success: true, stats: stats };
  } catch (err) {
    return { success: false, message: err.toString(), stats: stats };
  }
}

// -----------------------------------------------------------------------------
// Helper Utilities
// -----------------------------------------------------------------------------
function getOrCreateSheet(ss, name, tabColor) {
  var sheet = ss.getSheetByName(name);
  if (!sheet) {
    sheet = ss.insertSheet(name);
    if (tabColor) sheet.setTabColor(tabColor);
  }
  return sheet;
}

function formatHeaderRow(sheet, bgColor, fontColor) {
  sheet.getRange(1, 1, 1, sheet.getLastColumn())
    .setBackground(bgColor)
    .setFontColor(fontColor)
    .setFontWeight('bold')
    .setHorizontalAlignment('center')
    .setVerticalAlignment('middle');
  sheet.setRowHeight(1, 35);
}

function hashPassword(pass) {
  var raw = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, pass, Utilities.Charset.UTF_8);
  var hash = '';
  for (var i = 0; i < raw.length; i++) {
    var byteVal = raw[i];
    if (byteVal < 0) byteVal += 256;
    var byteHex = byteVal.toString(16);
    if (byteHex.length === 1) byteHex = '0' + byteHex;
    hash += byteHex;
  }
  return hash;
}

function getThaiMonthName(m) {
  var months = ['', 'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน', 'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'];
  return months[m] || '';
}
