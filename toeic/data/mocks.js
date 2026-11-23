/* TOEIC 迷你模考題庫（內建）。回數不固定：要加一回，就在陣列最後面 push 一個新物件（id 不可重複，
   已存在的 id 不要改，作答紀錄靠 id 對應）。頁面上的「AI 出一回新的」會另外產生更多回，存在帳號裡。
   每回：L = 聽力題（Part 2 / 3 / 4，用瀏覽器語音朗讀），R = 閱讀題（Part 5 / 6 / 7）。格式見 toeic/README.md。
   全部為原創的多益風格練習題，非 ETS 官方試題。 */
window.TOEIC_MOCKS=[
{id:"b1",title:"Mini mock 1",mins:35,
 L:[
  {p:2,say:"Where's the nearest copy machine?",o:["Down the hall on your left.","Make ten copies, please.","It's nearly finished."],a:0,e:"Where → 地點。(B) copies 重複字陷阱。"},
  {p:2,say:"Would you like to join us for lunch?",o:["I already ate, thanks.","The lunch menu is long.","Join the club."],a:0,e:"邀請 → 婉拒並說明原因。(B)(C) 都是重複字陷阱。"},
  {p:2,say:"Why hasn't the package been delivered?",o:["The address was incorrect.","A large package.","By express mail."],a:0,e:"Why → 說明原因：地址錯誤。"},
  {p:2,say:"Should we take a taxi or the subway to the airport?",o:["The subway is faster at this hour.","Yes, we should.","At terminal two."],a:0,e:"選擇疑問句（A or B）不能回答 Yes/No，要選一個。"},
  {p:2,say:"Mr. Kim is leading the training session, isn't he?",o:["No, it's been assigned to Ms. Ortiz.","The train leaves at six.","A two-day session."],a:0,e:"附加問句 → No＋更正。(B) train 與 training 近音陷阱。"},
  {p:2,say:"How much will it cost to repair the projector?",o:["The technician will let us know tomorrow.","In the meeting room.","About two hours."],a:0,e:"間接回答：技師明天才會告知。(C) 回答 How long。"},
  {p:3,talk:[["W","Excuse me, I booked a room for three nights, but I'd like to extend my stay until Sunday. Is that possible?"],["M","Let me check. Yes, we have availability, but you'd need to move to a different room on Saturday, because yours is already reserved."],["W","That's fine. Could someone help me with my luggage when I move?"],["M","Of course. Just call the front desk when you're ready, and a staff member will come up."]],qs:[
   {q:"Where most likely are the speakers?",o:["At a hotel","At an airport","At a train station","At a real estate agency"],a:0,e:"booked a room、front desk → 飯店。"},
   {q:"What does the woman want to do?",o:["Cancel a booking","Extend her stay","Get a refund","Change her flight"],a:1,e:"I'd like to extend my stay until Sunday."},
   {q:"What does the man say the woman should do?",o:["Pay in advance","Fill out a form","Call the front desk","Come back later"],a:2,e:"Just call the front desk when you're ready."}]},
  {p:3,talk:[["M","Hi Jenny, have you seen the sales figures for October?"],["W","Yes, they're lower than we expected. I think the new competitor downtown is attracting some of our customers."],["M","Maybe we should run a promotion next month. A ten percent discount might bring them back."],["W","Good idea. I'll draft a proposal and send it to the regional manager by Friday."]],qs:[
   {q:"What are the speakers discussing?",o:["A hiring plan","Recent sales results","A store renovation","A new supplier"],a:1,e:"sales figures for October → 最近的銷售結果。"},
   {q:"What does the man suggest?",o:["Opening a new branch","Offering a discount","Hiring more staff","Changing suppliers"],a:1,e:"run a promotion…a ten percent discount。"},
   {q:"What will the woman do by Friday?",o:["Meet a competitor","Send a proposal","Visit downtown","Revise a budget"],a:1,e:"I'll draft a proposal and send it… by Friday."}]},
  {p:4,talk:[["W","Hello, Mr. Daniels. This is Grace calling from Westfield Dental Clinic."],["W","I'm calling to remind you of your appointment tomorrow at 10 A.M. with Dr. Patel."],["W","Please note that our clinic has moved to a new location at 45 River Road, right next to the city library. Parking is available behind the building."],["W","If you need to change your appointment, please call us at least 24 hours in advance."]],qs:[
   {q:"Why is the speaker calling?",o:["To give a reminder about an appointment","To cancel a meeting","To request a payment","To introduce a new doctor"],a:0,e:"I'm calling to remind you of your appointment."},
   {q:"What has recently changed?",o:["The doctor's schedule","The clinic's location","The parking fees","The phone number"],a:1,e:"our clinic has moved to a new location。"},
   {q:"What should the listener do to reschedule?",o:["Arrive early","Bring some documents","Call at least a day in advance","Visit the library"],a:2,e:"call us at least 24 hours in advance = 至少提前一天（換句話說）。"}]},
  {p:4,talk:[["M","Attention, all passengers. Flight 208 to Tokyo, originally scheduled to depart at 3:15, has been delayed due to a mechanical inspection."],["M","The new departure time is 4:45."],["M","Passengers on this flight may pick up a meal voucher at the service desk near Gate 12."],["M","We apologize for the inconvenience and will provide further updates as soon as they become available."]],qs:[
   {q:"What is the cause of the delay?",o:["Bad weather","A mechanical inspection","A crew shortage","Heavy traffic"],a:1,e:"delayed due to a mechanical inspection。"},
   {q:"What time will the flight depart?",o:["3:15","3:45","4:15","4:45"],a:3,e:"The new departure time is 4:45。3:15 是原定時間，陷阱。"},
   {q:"What can passengers receive at the service desk?",o:["A meal voucher","A seat upgrade","A refund","A travel guide"],a:0,e:"pick up a meal voucher at the service desk。"}]}
 ],
 R:[
  {p:5,q:"The quarterly meeting will be held ____ March 3.",o:["in","at","on","by"],a:2,e:"日期前用 on。"},
  {p:5,q:"Ms. Ito has been ____ as the new head of the research department.",o:["appoint","appointed","appointing","appointment"],a:1,e:"has been + p.p. 被動 → appointed（被任命）。"},
  {p:5,q:"Our new software allows users to ____ access their files from any device.",o:["secure","securely","security","secured"],a:1,e:"to ___ access：修飾動詞 access → 副詞 securely。"},
  {p:5,q:"____ the budget was approved, the renovation began immediately.",o:["Once","During","Despite","Due to"],a:0,e:"後面接子句 → 連接詞 Once。"},
  {p:5,q:"Applications ____ after the deadline will not be considered.",o:["receive","receiving","received","are received"],a:2,e:"句子動詞是 will not be considered，空格是修飾 Applications 的分詞；申請書是「被收到」→ received（= which are received）。"},
  {p:5,q:"The training manual helps new employees become familiar ____ company policies.",o:["to","for","with","at"],a:2,e:"become familiar with（熟悉）。"},
  {p:5,q:"Mr. Novak is the most ____ candidate for the position.",o:["qualify","qualified","qualification","qualifying"],a:1,e:"the most ___ candidate：名詞前要形容詞 → qualified（合格的）。"},
  {p:5,q:"Neither the printer nor the scanners ____ working properly this morning.",o:["is","was","were","has been"],a:2,e:"neither A nor B 跟 B（scanners 複數），this morning 已過 → were。"},
  {p:5,q:"Please contact the IT department ____ you experience any problems with your password.",o:["if","unless","despite","so"],a:0,e:"後接子句，語意「如果遇到問題」→ if。"},
  {p:5,q:"The company's profits have increased ____ since the new CEO took over.",o:["significant","significance","significantly","signify"],a:2,e:"修飾動詞 increased → 副詞 significantly。"},
  {p:6,text:"To: All Staff\nFrom: Facilities Department\nSubject: Elevator Maintenance\n\nPlease be advised that the elevators in the east wing will be ___(1)___ for maintenance this Saturday from 8 A.M. to 5 P.M. During this time, employees ___(2)___ need to access the upper floors should use the stairs or the elevators in the west wing. ___(3)___ We expect all work to be finished by Saturday evening. ___(4)___, please contact the facilities office at extension 4420.",qs:[
   {q:"(1)",o:["closing","closed","close","closure"],a:1,e:"will be + p.p.：電梯被關閉 → closed。"},
   {q:"(2)",o:["which","who","whose","what"],a:1,e:"先行詞 employees 是人，後面缺主詞 → who。"},
   {q:"(3)",o:["The west wing elevators will operate as usual.","The cafeteria menu has been updated.","Please submit your timesheets by Friday.","New parking permits are now available."],a:0,e:"句子插入：前文提到改搭西翼電梯，接「西翼電梯照常運作」最連貫。"},
   {q:"(4)",o:["If you have any questions","Although it is closed","As a result of the stairs","In addition to the elevators"],a:0,e:"信件結尾的固定句：If you have any questions, please contact…"}]},
  {p:7,text:"Riverside Community Library: Notice\n\nStarting July 1, the library will extend its weekday hours. The library will now open at 8:00 A.M. and close at 9:00 P.M., Monday through Friday. Weekend hours (10:00 A.M. to 5:00 P.M.) will remain unchanged.\n\nIn addition, the second-floor study rooms can now be reserved online up to one week in advance. Library members who wish to reserve a room must log in with their membership number. For more information, visit www.riversidelib.org or speak with a staff member at the information desk.",qs:[
   {q:"What is the purpose of the notice?",o:["To announce new opening hours","To recruit volunteers","To introduce a new librarian","To advertise a book sale"],a:0,e:"第一句 will extend its weekday hours。"},
   {q:"What is indicated about weekend hours?",o:["They will be extended.","They will stay the same.","The library will be closed.","They will start at 8 A.M."],a:1,e:"will remain unchanged = stay the same（同義替換）。"},
   {q:"What is required to reserve a study room?",o:["A membership number","A fee","A phone call","A photo ID"],a:0,e:"must log in with their membership number。"}]},
  {p:7,text:"From: Mark Ellison <m.ellison@brightpath.com>\nTo: Sofia Ramirez\nDate: November 14\nSubject: Your interview\n\nDear Ms. Ramirez,\n\nThank you for applying for the position of marketing coordinator at BrightPath Consulting. We were impressed with your résumé and would like to invite you to an interview on Thursday, November 21, at 2:00 P.M. at our office on Harbor Street.\n\nThe interview will last about one hour and will include a short presentation. Please prepare a ten-minute talk about a marketing campaign you have worked on. A projector and laptop will be available in the room.\n\nPlease reply to this e-mail by Monday to confirm your attendance. If the suggested time is not convenient, let us know and we will do our best to find an alternative.\n\nSincerely,\nMark Ellison\nHuman Resources Manager",qs:[
   {q:"Why did Mr. Ellison write to Ms. Ramirez?",o:["To offer her a job","To invite her to an interview","To reject her application","To request her résumé"],a:1,e:"would like to invite you to an interview。"},
   {q:"What is Ms. Ramirez asked to prepare?",o:["A written report","A list of references","A short presentation","A marketing budget"],a:2,e:"Please prepare a ten-minute talk = 短簡報。"},
   {q:"What is NOT mentioned about the interview?",o:["Its location","Its length","The equipment available","The names of the interviewers"],a:3,e:"NOT 題用刪去法：地點 Harbor Street、時長 one hour、設備 projector and laptop 都有提到；面試官名字沒有。"},
   {q:"By when should Ms. Ramirez respond?",o:["Thursday","Monday","November 14","November 21"],a:1,e:"Please reply to this e-mail by Monday。"}]}
 ]}
];
