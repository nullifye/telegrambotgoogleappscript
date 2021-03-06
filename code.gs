const tgBotToken = 'Your-Telegram-Bot-Token-Goes-Here';
const botSheet   = 'Your-Bot-Sheet-ID-Goes-Here';
const loggerSheet= 'Your-Logger-Sheet-ID-Goes-Here';
const superAdmin = ['Telegram-ID-Of-Super-Admin'];
const webAppURL  = 'Your-Web-App-URL';

// https://github.com/peterherrmann/BetterLog
let Logger = BetterLog.useSpreadsheet(loggerSheet);

let Bot = Nahfar.createBot(tgBotToken, botSheet);

const threaded = [
  { q: 'Berikan nama penuh anda.' },
  { q: 'Apakah jantina anda?',
    o: {'reply_markup': {'keyboard': [[{ 'text': 'Lelaki' }],[{ 'text': 'Perempuan' }]],'resize_keyboard': true,'one_time_keyboard': true,'input_field_placeholder': 'Lelaki atau perempuan?'}},
    v: '^Lelaki$|^Perempuan$',
    w: '_Tekan papan kekunci di bawah._' },
  { q: 'Apakah nombor telefon bimbit anda?',
    o: {'reply_markup': {'keyboard': [[{ 'text': 'Hantar nombor telefon bimbit', 'request_contact': true }]],'resize_keyboard': true,'one_time_keyboard': true,'input_field_placeholder': 'Nombor telefon bimbit.'}} },
  { q: 'Masukkan nombor kad pengenalan.',
    v: '^\\d{12}$',
    w: '_Format nombor kad pengenalan tidak sah. Sila isi sekali lagi._'}
];

const menu = [
  [[{'text': 'About', 'callback_data': 'menu_about'}],
   [{'text': 'Menu 1', 'callback_data': 'menu_1'},
    {'text': 'Menu 2', 'callback_data': 'menu_2'}],
   [{'text': 'Language', 'callback_data': 'menu_3'}]],

  [[{'text': 'Back', 'callback_data': 'menu_0'}],
   [{'text': 'Profile', 'callback_data': 'menu_profile'}],
   [{'text': 'Settings', 'callback_data': 'menu_settings'}]],

  [[{'text': 'Back', 'callback_data': 'menu_0'}],
   [{'text': 'Menu 6', 'callback_data': 'menu_6'},
    {'text': 'Menu 7', 'callback_data': 'menu_7'},
    {'text': 'Menu 8', 'callback_data': 'menu_8'}],
   [{'text': 'Menu 9', 'callback_data': 'menu_9'}]],

  [[{'text': 'Back', 'callback_data': 'menu_0'}],
   [{'text': '🇬🇧 English', 'callback_data': 'menu_en'},
    {'text': '🇲🇾 Malay', 'callback_data': 'menu_my'}],
   [{'text': '🇨🇳 Chinese', 'callback_data': 'menu_cn'},
    {'text': '🇮🇳 Tamil', 'callback_data': 'menu_in'}],
   [{'text': '🇯🇵 Japanese', 'callback_data': 'menu_jp'},
    {'text': '🇷🇺 Russian', 'callback_data': 'menu_ru'}]]
];

function setWebHook() {
  let payload = {
    url: webAppURL
  };

  let response = Bot.request('setWebhook', payload);
  Logger.log(JSON.stringify(response));
}

function oneTimeSetup() {
  Bot.settingUpBotSheet();
}

function scheduleClearTmp_() {
  Bot.cleanUpBotTmpData();
}

function scheduler() {
  ScriptApp.newTrigger('scheduleClearTmp_').timeBased().everyDays(1).atHour(4).nearMinute(5).inTimezone("Asia/Kuala_Lumpur").create();
}

function doGet(e) {

}

let TelegramJSON;

function doPost(e) {
  if(e.postData.type == "application/json") {
    TelegramJSON = JSON.parse(e.postData.contents);
    Bot.getUpdate(TelegramJSON);

    Logger.log(JSON.stringify(TelegramJSON));

    let tc = Bot.userHasThreadedConversation();

    // threaded conversation
    if(tc.found) {
      if(tc.step == threaded.length) {
        let ans = Bot.endThreadedConversation(threaded,tc.step);

        if(ans) {
          // do processing here
          Logger.log(ans);

          let msg = "Data telah direkodkan. Terima kasih.";
          Bot.sendMessageKeyboardRemove(msg);
        }
      }
      else
        Bot.nextMessageInThreadedConversation(threaded, tc.step);
    }

    // command message
    else if(Bot.isBotCommand()) {
      let text = TelegramJSON.message.text;

      if(text == '/start') {
        let msg = "Selamat datang [" + Bot.getUserFullName() + "](" + Bot.mentionByID() + ").";

        Bot.sendMessage(msg);
      }
      else if(text == '/whoami') {
        let msg = "`ID        :` `" + Bot.getUserID() + "`\n" +
                  "`Username  :` " + Bot.getUsername() + "\n" +
                  "`First Name:` " + Bot.getUserFirstName() + "\n" +
                  "`Last Name :` " + Bot.getUserLastName() + "\n" +
                  "`Language  :` " + TelegramJSON.message.from.language_code + "\n" +
                  "`Is bot    :` " + TelegramJSON.message.from.is_bot;

        Bot.sendMessage(msg);
      }
      else if(text == '/request') {
        let a = Bot.getSystemUser();

        if(a && a.isAuth) {
          let msg = "You already are an authorized user.";
          Bot.sendMessage(msg);
          return;
        }
        else if(a) {
          let msg = "You have made a request before. Please wait for the admin to respon.";
          Bot.sendMessage(msg);
          return;
        }

        Bot.addSystemUser();

        let msg = "Your request has been sent to the admin.";
        Bot.sendMessage(msg);

        // send request message to the admin
        let sendTo = Bot.getAdminsID() || superAdmin;

        const len = sendTo.length;
        for(let i = 0; i < len; i++) {
          let options = {
            'chat_id': sendTo[i],
            'reply_markup': {
              'inline_keyboard': [
                [ 
                  { 'text': 'Deny', 'callback_data': 'user_deny_' + Bot.getUserID() },
                  { 'text': 'Approve', 'callback_data': 'user_approve_' + Bot.getUserID() }
                ]
              ]
            }
          };

          msg = "This user request you permission\n\n" +
                "`ID        :` [" + Bot.getUserID() + "](" + Bot.mentionByID() + ")\n" +
                "`Username  :` " + Bot.getUsername() + "\n" +
                "`First Name:` " + Bot.getUserFirstName() + "\n" +
                "`Last Name :` " + Bot.getUserLastName() + "\n" +
                "`Language  :` " + TelegramJSON.message.from.language_code + "\n" +
                "`Is bot    :` " + TelegramJSON.message.from.is_bot;
          Bot.sendMessage(msg, options);
        }
      }
      else if(text == '/rate') {
        let keyboard = '⭐️,⭐️⭐️;⭐️⭐️⭐️,⭐️⭐️⭐️⭐️';
        let msg = "How do you rate this bot?";

        Bot.sendMessageCustomKeyboard(msg, keyboard, 'Gimme your stars...');
      }
      else if(text == '/menu') {
        let options = {
          'reply_markup': {
            'inline_keyboard': menu[0]
          }
        };

        msg = "*Menu Option*\n\nSelect any option from the list below.";
        Bot.sendMessage(msg, options);
      }
      else if(text == '/ask') {
        Bot.startThreadedConversation(threaded);
      }
    }

    // coordinate/location
    else if(Bot.isMap()) {
      let lat  = TelegramJSON.message.location.latitude,
          long = TelegramJSON.message.location.longitude;

      Bot.sendVenue(lat, long, lat+','+long, 'My location right now.');
    }

    // forwarded message
    else if(Bot.isForwarded()) {
      // only super admin can use this action
      if(superAdmin.indexOf(Bot.getUserID()+'') > -1) {
        let fwd = Bot.hasForwardedFrom();
        if(!fwd) {
          let msg = 'This user has set *Privacy and Security* of *Forwarded Messages* to *Nobody*. I cannot find the ID.';
          Bot.sendMessage(msg);
          return;
        }

        let exist = Bot.getSystemUser(fwd.id);
        let action, msg;

        if(exist && exist.isAdmin) {
          action = 'admin_revoke_';
          msg = 'Revoke admin privilege';
        }
        else if(exist && exist.isAuth) {
          action = 'admin_promote_';
          msg = 'Promote as an admin';
        }

        if(action) {
          let options = {
            'reply_markup': {
              'inline_keyboard': [
                [
                  { 'text': 'Cancel', 'callback_data': 'admin_cancel_' + exist.id },
                ],
                [
                  { 'text': 'Remove this user', 'callback_data': 'admin_deny_' + exist.id },
                ],
                [
                  { 'text': msg, 'callback_data': action + exist.id }
                ]
              ]
            }
          };

          msg = "Information about this user\n\n" +
                "`ID        :` [" + exist.id + "](" + Bot.mentionByID(exist) + ")\n" +
                "`Username  :` " + exist.username + "\n" +
                "`First Name:` " + exist.firstName + "\n" +
                "`Last Name :` " + exist.lastName + "\n" +
                "`Is Admin? :` *" + exist.isAdmin + '*';
          Bot.sendMessage(msg, options);
        }
      }
      else if(Bot.isAdmin()) {
        let fwd = Bot.hasForwardedFrom();
        if(!fwd) {
          let msg = 'This user has set *Privacy and Security* of *Forwarded Messages* to *Nobody*. I cannot find the ID.';
          Bot.sendMessage(msg);
          return;
        }

        let exist = Bot.getSystemUser(fwd.id);
        let action, msg, options;

        if(exist && exist.isAdmin) {
          options = {};
          action = '\n\n_You cannot do anything because this user is an admin; same level as you._';
        }
        else if(exist && exist.isAuth) {
          options = {
            'reply_markup': {
              'inline_keyboard': [
                [
                  { 'text': 'Cancel', 'callback_data': 'admin_cancel_' + exist.id },
                ],
                [
                  { 'text': 'Remove this user', 'callback_data': 'admin_deny_' + exist.id },
                ]
              ]
            }
          };
          action = '';
        }

        if(options) {
          msg = "Information about this user\n\n" +
                "`ID        :` [" + exist.id + "](" + Bot.mentionByID(exist) + ")\n" +
                "`Username  :` " + exist.username + "\n" +
                "`First Name:` " + exist.firstName + "\n" +
                "`Last Name :` " + exist.lastName + "\n" +
                "`Is Admin? :` *" + exist.isAdmin + '*' + action;
          Bot.sendMessage(msg, options);
        }
      }
    }

    // normal message
    else if(Bot.isTextMessage()) {
      let text = TelegramJSON.message.text;

      if(text == '⭐️' || text == '⭐️⭐️' || text == '⭐️⭐️⭐️' || text == '⭐️⭐️⭐️⭐️') {
        Bot.sendMessageKeyboardRemove('Thank you for the rating!');
      }
      else
        Bot.sendChatAction('find_location');

    }

    // callback_query
    else if(Bot.isCallbackQuery()) {
      let cb = TelegramJSON.callback_query;
      let cbdata = cb.data.split('_');
      let msg = '', msg2 = '';

      if(cbdata[0] == 'menu') {
        if(cbdata[1] < menu.length) {
          Bot.editMessageReplyMarkup(TelegramJSON.callback_query.message.message_id, null, menu[cbdata[1]]);

          Bot.request('answerCallbackQuery', { callback_query_id: TelegramJSON.callback_query.id });
        }
        else {
          Bot.request('answerCallbackQuery', { callback_query_id: TelegramJSON.callback_query.id,
                                               text: 'You have clicked menu ' + cbdata[1] });
        }
        return;
      }

      Bot.request('answerCallbackQuery', { callback_query_id: TelegramJSON.callback_query.id,
                                           show_alert: true,
                                           text: 'I will notify the user. Thanks!' });

      let exist = Bot.getSystemUser(cbdata[2]);

      if(cbdata[0] == 'user') {
        if(exist && exist.isAuth) {
          msg2 = "Request from [" + cbdata[2] + "](tg://user?id=" + cbdata[2] + ") was *approved* before by other admin.";
          Bot.editMessageText(msg2, TelegramJSON.callback_query.message.message_id);
          return;
        }
        else if(!exist) {
          msg2 = "Request from [" + cbdata[2] + "](tg://user?id=" + cbdata[2] + ") was *denied* before by other admin.";
          Bot.editMessageText(msg2, TelegramJSON.callback_query.message.message_id);
          return;
        }

        if(cbdata[1] == 'approve') {
          Bot.authSystemUser(cbdata[2], true);

          msg  = "_You have been authorized as a user of this bot._";
          msg2 = "Request from [" + cbdata[2] + "](tg://user?id=" + cbdata[2] + ") was *approved* by you.";
        }
        else if(cbdata[1] == 'deny') {
          Bot.authSystemUser(cbdata[2], false);

          msg  = "_Your request have been rejected!_";
          msg2 = "Request from [" + cbdata[2] + "](tg://user?id=" + cbdata[2] + ") was *rejected* by you.";
        }
      }
      else if(cbdata[0] == 'admin') {
        if(!(exist && exist.isAuth)) {
          msg2 = "User [" + cbdata[2] + "](tg://user?id=" + cbdata[2] + ") is not exist!";
          Bot.editMessageText(msg2, TelegramJSON.callback_query.message.message_id);
          return;
        }

        if(cbdata[1] == 'cancel') {
          msg2 = "This operation was canceled!";
          Bot.editMessageText(msg2, TelegramJSON.callback_query.message.message_id);
          return;
        }
        else if(cbdata[1] == 'promote') {
          Bot.makeAdmin(cbdata[2], true);

          msg  = "_You have been promoted as an admin._";
          msg2 = "User [" + cbdata[2] + "](tg://user?id=" + cbdata[2] + ") was *promoted as an admin* by you.";
        }
        else if(cbdata[1] == 'revoke') {
          Bot.makeAdmin(cbdata[2], false);

          msg  = "_You are no longer an admin. You are fired!_";
          msg2 = "User [" + cbdata[2] + "](tg://user?id=" + cbdata[2] + ") was *demoted as an admin* by you.";
        }
        else if(cbdata[1] == 'deny') {
          Bot.authSystemUser(cbdata[2], false);

          msg  = "_Your have been banned!_";
          msg2 = "User [" + cbdata[2] + "](tg://user?id=" + cbdata[2] + ") was *banned* by you.";
        }
      }

      Bot.sendMessage(msg, { chat_id: cbdata[2] });

      Bot.editMessageText(msg2, TelegramJSON.callback_query.message.message_id);
    }
  }
}
