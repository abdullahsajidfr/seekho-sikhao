// Paste the entire contents of this file into Google Apps Script editor.
// Setup: Deploy as Web App → Execute as Me → Anyone can access.
// See project CLAUDE.md for full setup steps.

var QUESTION_MAP = {
  1: { text: 'How did you feel using the app?',                  section: 'Part A: Seekho Sikhao App' },
  2: { text: 'How easy was it to understand what the app said?', section: 'Part A: Seekho Sikhao App' },
  3: { text: 'Would you use this app for homework?',             section: 'Part A: Seekho Sikhao App' },
  4: { text: 'How did you feel using ChatGPT?',                  section: 'Part B: ChatGPT' },
  5: { text: 'How easy was it to understand what ChatGPT said?', section: 'Part B: ChatGPT' },
  6: { text: 'Would you use ChatGPT for homework?',              section: 'Part B: ChatGPT' },
};

function doPost(e) {
  try {
    var data = JSON.parse(e.postData.contents);
    var ss = SpreadsheetApp.getActiveSpreadsheet();

    if (data.type === 'session_start') {
      handleSessionStart(ss, data);
    } else if (data.type === 'session_end') {
      handleSessionEnd(ss, data);
    } else if (data.type === 'event') {
      handleEvent(ss, data);
      if (isSmileyometerEvent(data.eventLabel)) {
        handleSmileyometer(ss, data);
      }
    }
  } catch (err) {
    Logger.log('doPost error: ' + err.toString());
  }

  return ContentService
    .createTextOutput(JSON.stringify({ ok: true }))
    .setMimeType(ContentService.MimeType.JSON);
}

function doGet(e) {
  return ContentService
    .createTextOutput('Seekho Sikhao Logger is running.')
    .setMimeType(ContentService.MimeType.TEXT);
}

function handleSessionStart(ss, data) {
  var sheet = getOrCreateSheet(ss, 'Sessions', [
    'SessionID', 'StudentName', 'Grade', 'Date', 'StartTime', 'EndTime', 'TotalDurationMs'
  ]);

  var rows = sheet.getDataRange().getValues();
  for (var i = 1; i < rows.length; i++) {
    if (rows[i][0] === data.sessionId) {
      sheet.getRange(i + 1, 5).setValue(data.startTime || '');
      sheet.getRange(i + 1, 4).setValue(data.date || '');
      return;
    }
  }
  sheet.appendRow([
    data.sessionId   || '',
    data.studentName || '',
    data.grade       || '',
    data.date        || '',
    data.startTime   || '',
    '',
    '',
  ]);
}

function handleSessionEnd(ss, data) {
  var sheet = getOrCreateSheet(ss, 'Sessions', [
    'SessionID', 'StudentName', 'Grade', 'Date', 'StartTime', 'EndTime', 'TotalDurationMs'
  ]);

  var rows = sheet.getDataRange().getValues();
  for (var i = 1; i < rows.length; i++) {
    if (rows[i][0] === data.sessionId) {
      sheet.getRange(i + 1, 6).setValue(data.endTime          || '');
      sheet.getRange(i + 1, 7).setValue(data.totalDurationMs  || '');
      return;
    }
  }
  sheet.appendRow([
    data.sessionId       || '',
    data.studentName     || '',
    data.grade           || '',
    '',
    '',
    data.endTime         || '',
    data.totalDurationMs || '',
  ]);
}

function handleEvent(ss, data) {
  var sheet = getOrCreateSheet(ss, 'EventLog', [
    'SessionID', 'StudentName', 'Grade', 'EventType', 'EventLabel',
    'AbsoluteTime', 'RelativeMs', 'TaskPhase'
  ]);
  sheet.appendRow([
    data.sessionId    || '',
    data.studentName  || '',
    data.grade        || '',
    data.eventType    || '',
    data.eventLabel   || '',
    data.absoluteTime || '',
    data.relativeMs   !== undefined ? data.relativeMs : '',
    data.taskPhase    || '',
  ]);
}

function isSmileyometerEvent(label) {
  return label && label.indexOf('smileyometer:') === 0;
}

function handleSmileyometer(ss, data) {
  var sheet = getOrCreateSheet(ss, 'Smileyometer', [
    'SessionID', 'StudentName', 'Grade', 'QuestionNumber', 'Section',
    'QuestionText', 'Score', 'AbsoluteTime', 'RelativeMs'
  ]);

  var match = data.eventLabel.match(/^smileyometer:q(\d+):response:(\d+)$/);
  if (!match) return;

  var questionNum = parseInt(match[1], 10);
  var score       = parseInt(match[2], 10);
  var qInfo       = QUESTION_MAP[questionNum] || { text: '', section: '' };

  sheet.appendRow([
    data.sessionId    || '',
    data.studentName  || '',
    data.grade        || '',
    questionNum,
    qInfo.section,
    qInfo.text,
    score,
    data.absoluteTime || '',
    data.relativeMs   !== undefined ? data.relativeMs : '',
  ]);
}

function getOrCreateSheet(ss, name, headers) {
  var sheet = ss.getSheetByName(name);
  if (!sheet) {
    sheet = ss.insertSheet(name);
    sheet.appendRow(headers);
    sheet.getRange(1, 1, 1, headers.length).setFontWeight('bold');
  }
  return sheet;
}
