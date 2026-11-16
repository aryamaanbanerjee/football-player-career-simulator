    /* ---------- END · Late career and retirement ---------- */
    S('END-01', {
      title: 'The first grey hair', when: 'season', trig: 'Age 31+', tone: 'funny',
      if: (c) => c.age >= 31 && !c.has('grey_hair'),
      text: '{kitman} spotted your first grey hair during a team photo and announced it to the squad. The youngest player asked if you had played against anyone famous from “the olden days”.',
      sets: ['grey_hair'],
    });
    S('END-02', {
      title: 'A different job', when: 'season', trig: 'Age 32+ and fewer than 25 appearances', tone: 'drama',
      if: (c) => c.age >= 32 && c.apps < 25 && !c.loan,
      text: '{gaffer} sat you down and explained your role was changing: fewer starts, more minutes from the bench, more time with the young players.',
      choices: [
        { label: 'Accept it fully', desc: 'Be the best impact sub in the league.', out: 'You came off the bench in the next game and changed it. The dressing room noticed how you took it.', fx: { form: 0.04, aff: { gaffer: 1 } }, sets: ['accepted_role'] },
        { label: 'Fight for your place', desc: 'Make the decision hard for them.', out: 'You trained like an 18-year-old. {gaffer} said, “That’s what I wanted to see,” which was annoying.', fx: { form: 0.03 } },
      ],
    });
    S('END-03', {
      title: 'Last derby', when: 'season', trig: 'Your final season', tone: 'warm',
      if: (c) => c.yearsLeft === 0 && !c.loan,
      text: 'Your last derby. The away fans, who have booed you for years, gave you a round of applause when you were substituted. It was the strangest and nicest noise you have heard in football.',
    });
    S('END-04', {
      title: 'Telling people', when: 'season', trig: 'The season before your last', tone: 'warm',
      if: (c) => c.yearsLeft === 1 && !c.has('told_retirement'),
      text: 'You decided next season will be your last. The question is who you tell first.',
      choices: [
        { label: 'Tell everyone now', desc: 'A farewell season, done properly.', out: 'Every away ground gave you a moment. Some gave you gifts. One gave you a goat-shaped cake.', fx: { mood: 8 }, sets: ['farewell_tour'] },
        { label: 'Tell only {parent} and {coach}', desc: 'Keep it quiet until the end.', out: '{coach} said, “About time you listened to your knees.” {parent} cried, then asked what you’d do with your Saturdays.', fx: { aff: { coach: 1 } }, sets: ['quiet_retirement'] },
      ],
      sets: ['told_retirement'],
    });
    S('END-05', {
      title: 'Guard of honour', when: 'retire', trig: 'Retirement after 300+ career appearances', tone: 'proud',
      if: (c) => c.apps >= 300,
      text: 'In your last game both teams formed a guard of honour. You walked through it slowly so you would remember each face. {kitman} was at the end of the line, holding your first ever boots.',
    });
    S('END-06', {
      title: 'The last one', when: 'retire', trig: 'Retirement, attacker', tone: 'proud',
      if: (c) => c.isAtt,
      text: 'Your last goal was a tap-in from a yard out. After everything, a tap-in. You laughed all the way back to the halfway line.',
    });
    S('END-07', {
      title: 'The last save', when: 'retire', trig: 'Retirement, goalkeeper or defender', tone: 'proud',
      if: (c) => !c.isAtt,
      text: 'Your last act as a footballer was a block in the 89th minute. You got up, wiped your face and looked at the clock. You wanted to remember what the stadium looked like from exactly there.',
    });
    S('END-08', {
      title: 'Press conference', when: 'retire', trig: 'Retirement, the journalist covered you from your debut', tone: 'warm',
      if: (c) => c.aff('journo') >= 0,
      text: 'At the retirement press conference {journo} asked the last question: “What would you tell the kid in your first match report?” You thought for a long time. “Keep the boots.”',
    });
    S('END-09', {
      title: 'What next', when: 'retire', trig: 'Retirement', tone: 'warm',
      if: () => true,
      text: 'Everyone wants to know what you’ll do now.',
      choices: [
        { label: 'Coaching', desc: 'Start at the bottom, with kids.', out: '{academyClub} offered you the under-12s. Your first session plan is {coach}’s, word for word.', sets: ['after_coach'] },
        { label: 'Television', desc: 'A pundit’s chair and a nice jacket.', out: 'Your first appearance went viral because you defended a referee. Nobody saw that coming, including you.', sets: ['after_tv'] },
        { label: 'Back home', desc: 'Time with family in {hometown}.', out: 'You coach {hometown}’s Sunday team for free. They lose most weeks and have never been happier.', sets: ['after_home'] },
      ],
    });
    S('END-10', {
      title: 'A number on the wall', when: 'retire', trig: 'Retirement with a retired shirt', tone: 'proud',
      if: (c) => c.retiredShirt,
      text: 'The club retired your shirt. The framed {num} went up in the main stand. Under it, someone had already stuck a small handwritten note: “Row F says thank you.”',
    });
    S('END-11', {
      title: 'The testimonial', when: 'retire', trig: 'Retirement after a long spell at one club', tone: 'warm',
      if: (c) => c.legend,
      text: 'Your testimonial sold out. {mate} played the first half on your team, {rival} the second half against you. The final score was 7–7 and nobody remembers who scored.',
      sets: ['testimonial'],
    });
    S('END-12', {
      title: 'One shirt, every club', when: 'retire', trig: 'Retirement after playing for four or more clubs', tone: 'warm',
      if: (c) => c.clubs >= 4,
      text: 'You framed one shirt from every club you played for and hung them up the stairs in order. {sibling} says it looks like a museum. {parent} dusts them every Sunday.',
    });

    /* ---------- OFF · Off the pitch ---------- */
    S('OFF-01', {
      title: 'Right sock first', when: 'season', trig: 'Any season, random', tone: 'funny', w: 0.6,
      if: (c) => c.rnd(0.25) && !c.has('superstition'),
      text: 'You put your right sock on first before a game and scored. You have put your right sock on first before every game since. If anyone asks, it’s “a routine”.',
      sets: ['superstition'],
    });
    S('OFF-02', {
      title: 'The haircut', when: 'season', trig: 'Age 19–24, random', tone: 'funny', w: 0.6,
      if: (c) => c.age >= 19 && c.age <= 24 && c.rnd(0.3) && !c.has('haircut'),
      text: 'A barber talked you into “something bold”. The fans made a banner of it. {parent} still has the photo as the background on their phone, “so I never forget”.',
      sets: ['haircut'],
    });
    S('OFF-03', {
      title: '{sibling} signs', when: 'season', trig: 'Your sibling reaches 16', tone: 'proud',
      if: (c) => c.siblingAge === 16,
      text: '{sibling} signed academy forms at {academyClub}. They asked for your old locker. {coach} said, “Another one,” and sounded delighted about it.',
      sets: ['sibling_academy'],
    });
    S('OFF-04', {
      title: 'Lucky scarf', when: 'season', trig: 'A trophy season, random', tone: 'funny',
      if: (c) => c.trophies > 0 && c.rnd(0.4) && !c.has('lucky_scarf'),
      text: '{parent} wore the same scarf to every game this season and refuses to wash it until it stops working. The rest of the family sits a seat away.',
      sets: ['lucky_scarf'],
    });
    S('OFF-05', {
      title: 'The mural', when: 'season', trig: 'Age 24+ with a big season, random', tone: 'proud',
      if: (c) => c.age >= 24 && c.rating >= 7.6 && !c.has('mural') && c.rnd(0.5),
      text: 'Someone painted a mural of you on a wall in {hometown}. Your nose is slightly too big. You love it. You visit it when nobody is looking.',
      sets: ['mural'],
    });
    S('OFF-06', {
      title: 'You learned to cook', when: 'season', trig: 'Any season abroad, random', tone: 'funny',
      if: (c) => c.abroad && c.rnd(0.3) && !c.has('cooking'),
      text: 'Living alone abroad, you learned to cook. Exactly one dish. You make it brilliantly. Your team-mates have eaten it at every dinner party for three years.',
      sets: ['cooking'],
    });
    S('OFF-07', {
      title: 'The dog', when: 'season', trig: 'Age 22+, random', tone: 'funny',
      if: (c) => c.age >= 22 && c.rnd(0.25) && !c.has('dog'),
      text: 'You adopted a dog and named it after {coach}. {coach} says they are “honoured and insulted in equal measure”. The dog has better ball control than most of your team.',
      sets: ['dog'],
    });
    S('OFF-08', {
      title: 'Someone who doesn’t care', when: 'season', trig: 'Age 22–28, random', tone: 'warm',
      if: (c) => c.age >= 22 && c.age <= 28 && c.rnd(0.25) && !c.has('partner'),
      text: 'You met someone at a friend’s birthday who had no idea who you were. When they found out, they asked if football was “a full-time thing”. You knew then.',
      sets: ['partner'],
    });
    S('OFF-09', {
      title: 'Supermarket', when: 'season', trig: 'Any season at a club where fans like you, random', tone: 'funny',
      if: (c) => c.mood >= 60 && c.rnd(0.3),
      text: 'A man stopped you in the supermarket, told you exactly what you did wrong in the last game, then asked for a selfie and told you to “keep going, son”.',
    });
    S('OFF-10', {
      title: 'Video-game rating', when: 'season', trig: 'Age 20+ with a strong season', tone: 'funny',
      if: (c) => c.age >= 20 && c.rating >= 7.4 && !c.has('game_rating') && c.rnd(0.5),
      text: 'Your rating in the new football video game came out one point lower than {captain}’s. You were calm about it in public. In private, {sibling} has screenshots of the messages.',
      sets: ['game_rating'],
    });
    S('OFF-11', {
      title: 'The podcast', when: 'season', trig: 'Age 26+, your best mate still in touch', tone: 'funny',
      if: (c) => c.age >= 26 && c.aff('mate') >= 1 && !c.has('podcast'),
      text: '{mate} started a podcast and made you the first guest. It has 400 listeners. 120 of them are his family. You did a second episode anyway.',
      sets: ['podcast'],
    });
    S('OFF-12', {
      title: 'Your name on a trophy', when: 'season', trig: 'Age 28+, retired shirt or legend path, random', tone: 'warm',
      if: (c) => c.age >= 28 && c.stint >= 4 && c.rnd(0.4) && !c.has('kids_cup'),
      text: 'A youth tournament in {hometown} was renamed after you. You presented the trophy. The winning captain was nine and very serious about the handshake.',
      sets: ['kids_cup'],
    });
    S('OFF-13', {
      title: 'The parents’ chat', when: 'season', trig: 'Any season, random', tone: 'funny', w: 0.5,
      if: (c) => c.rnd(0.25) && !c.has('parents_chat'),
      text: '{parent} is in a group chat with the parents of four of your team-mates. They know about transfers before you do. They predicted the last two.',
      sets: ['parents_chat'],
    });
    S('OFF-14', {
      title: 'Driving test', when: 'season', trig: 'Age 17–19', tone: 'funny',
      if: (c) => c.age >= 17 && c.age <= 19 && !c.has('driving_test') && c.rnd(0.5),
      text: 'You failed your driving test three times. The examiner on the third attempt was a fan of your rivals. You passed on the fourth with an examiner who asked for an autograph halfway round.',
      sets: ['driving_test'],
    });
    S('OFF-15', {
      title: 'The sticker', when: 'season', trig: 'Age 19+, first season in a top league', tone: 'warm',
      if: (c) => c.age >= 19 && c.stars >= 4 && c.first && !c.has('sticker'),
      text: '{sibling} opened a packet of stickers and found you. They screamed so loudly the shopkeeper came to check. The sticker is in a frame. The doubles are in your car, “for emergencies”.',
      sets: ['sticker'],
    });
    S('OFF-16', {
      title: 'Holiday call', when: 'open', trig: 'A window with a big offer, random', tone: 'funny',
      if: (c) => c.offers >= 3 && c.rnd(0.3) && !c.has('holiday_call'),
      text: '{agent} rang while you were on a pedalo in the middle of a lake. You negotiated part of a contract pedalling back to shore. It took eleven minutes.',
      sets: ['holiday_call'],
    });
    S('OFF-17', {
      title: 'Old classroom', when: 'season', trig: 'Age 25+, random', tone: 'warm',
      if: (c) => c.age >= 25 && c.rnd(0.2) && !c.has('old_school'),
      text: 'You visited your old school. Your PE teacher still has the register where you wrote “footballer” as your future job, aged eight. Years ago they had marked it with a red tick.',
      sets: ['old_school'],
    });
