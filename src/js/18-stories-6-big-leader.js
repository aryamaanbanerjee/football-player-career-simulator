    /* ---------- BIG · Big moments ---------- */
    S('BIG-01', {
      title: 'The first medal', when: 'season', trig: 'Your first trophy of any kind', tone: 'proud',
      if: (c) => c.trophies > 0 && !c.has('first_trophy'),
      text: 'Your first winner’s medal. You found {parent} in the crowd and threw it to them, which security did not enjoy. It now lives in the kitchen drawer with the takeaway menus, because “that’s where the important things go”.',
      sets: ['first_trophy'],
    });
    S('BIG-02', {
      title: 'Champions at home', when: 'season', trig: 'Winning a league title', tone: 'proud',
      if: (c) => c.won('DOMESTIC_LEAGUE') && !c.has('first_league'),
      text: 'The title was won at home. When the whistle went, {kitman} sprinted onto the pitch faster than anyone has ever seen them move, then sat on the grass and cried into a bag of bibs.',
      sets: ['first_league'],
    });
    S('BIG-03', {
      title: 'In the same coat', when: 'season', trig: 'Winning a continental cup', tone: 'proud',
      if: (c) => c.won('CONTINENTAL') && !c.has('first_continental'),
      text: 'In the stand for the final, wearing the same coat they wore to your under-12 games, was {coach}. You ran past the players, past the cameras, and handed them your medal through the fence for a minute.',
      sets: ['first_continental'], fx: { aff: { coach: 1 } },
    });
    S('BIG-04', {
      title: 'Hat-trick ball', when: 'season', trig: 'Attacker, 20+ goals in a season', tone: 'funny',
      if: (c) => c.isAtt && c.stat >= 20 && !c.has('hattrick_ball'),
      text: 'You scored a hat-trick and took the match ball home. {sibling} asked every visitor to sign it, including a delivery driver, so it now has 31 signatures and only three of them are footballers.',
      sets: ['hattrick_ball'],
    });
    S('BIG-05', {
      title: 'The award', when: 'season', trig: 'Winning an individual award', tone: 'proud',
      if: (c) => c.awardCount > 0 && !c.has('first_award'),
      text: 'You won {award}. Your acceptance speech lasted eleven seconds and thanked {kitman} by name, which made {kitman} famous for a week. They still bring it up.',
      sets: ['first_award'],
    });
    S('BIG-06', {
      title: 'The suit', when: 'season', trig: 'A top-three Ballon d’Or finish', tone: 'funny',
      if: (c) => c.bd && c.bd <= 3 && !c.has('gala_suit'),
      text: 'The Ballon d’Or gala needs a suit. You tried on eleven. You chose one that {sibling} described as “a sofa in a nice hotel”.',
      sets: ['gala_suit'],
    });
    S('BIG-07', {
      title: 'The speech', when: 'season', trig: 'Winning the Ballon d’Or', tone: 'proud',
      if: (c) => c.ballon && !c.has('ballon_speech'),
      text: 'You had a speech written. You didn’t use it. You said, “There’s a wall at {academyClub} with a ball mark on it the size of a dinner plate. That’s where this is from.” {coach} watched it on a laptop in the academy office, alone, and didn’t answer the phone for an hour.',
      sets: ['ballon_speech'], fx: { aff: { coach: 2 } },
    });
    S('BIG-08', {
      title: 'Two in one', when: 'season', trig: 'Two or more major trophies in one season', tone: 'proud',
      if: (c) => c.majorCount >= 2,
      text: 'A double. The club printed a poster of the squad with both trophies. You are standing at the back, on tiptoes, because {captain} insisted on being at the front.',
    });
    S('BIG-09', {
      title: 'Century', when: 'season', trig: 'Reaching 100 career goals (or clean sheets)', tone: 'proud',
      if: (c) => c.crossed(100),
      text: 'Number 100. {journo} dug out their match report from your debut and printed both side by side. In the first one, your name is spelled wrong.',
      sets: ['century'],
    });
    S('BIG-10', {
      title: 'So close', when: 'season', trig: 'Finishing 4th or 5th in the Ballon d’Or', tone: 'drama',
      if: (c) => c.bd && c.bd >= 4 && c.bd <= 5,
      text: 'Fourth in the world. {parent} said it was “basically a medal”. {coach} said, “Fourth is a ladder, not a wall.” You wrote that on a sticky note on the bathroom mirror.',
    });
    S('BIG-11', {
      title: 'Rain on the parade', when: 'season', trig: 'A trophy parade, random', tone: 'funny',
      if: (c) => c.trophies > 0 && c.rnd(0.35),
      text: 'It poured for the trophy parade. Nobody cared. You held the trophy over your head as an umbrella for two hours and have never been happier to be wet.',
    });
    S('BIG-12', {
      title: 'That music', when: 'season', trig: 'First season with a club in a continental competition', tone: 'warm',
      if: (c) => !c.loan && c.stars >= 4 && c.first && !c.has('anthem_ucl'),
      text: 'The first time you heard the continental anthem from the pitch instead of the sofa, you forgot to stretch. {gaffer} had to nudge you.',
      sets: ['anthem_ucl'],
    });
    S('BIG-13', {
      title: 'Player of the year, for {sibling}', when: 'season', trig: 'Winning Player of the Year', tone: 'warm',
      if: (c) => c.awardNames.some((a) => /Player of the (Year|Season)/i.test(a)) && !c.has('poty_sibling'),
      text: 'You gave the Player of the Year trophy to {sibling}, who took it to school for show-and-tell. It was confiscated by a teacher who supports a rival club.',
      sets: ['poty_sibling'],
    });

    /* ---------- LDR · Prime and leadership ---------- */
    S('LDR-01', {
      title: 'The new kid', when: 'season', trig: 'Age 29+, your first season in your prime with a youngster in the squad',
      if: (c) => c.age >= 29 && !c.loan && !c.has('protege_met'),
      text: 'A 17-year-old called {protege} joined first-team training and was sick in the toilets before his first session. You handed him a mint without a word.',
      sets: ['protege_met'],
    });
    S('LDR-02', {
      title: 'Nutmegged', when: 'season', trig: 'The season after meeting your protege', tone: 'funny',
      needs: ['protege_met'], if: (c) => c.has('protege_met') && !c.has('protege_nutmeg') && c.rnd(0.7),
      text: '{protege} nutmegged you in training and ran away laughing. The whole squad stopped. You chased him to the car park, then took him for lunch.',
      sets: ['protege_nutmeg'],
    });
    S('LDR-03', {
      title: 'Your pass, his goal', when: 'season', trig: 'Mentoring your protege, a strong season', tone: 'proud',
      needs: ['protege_met'], if: (c) => c.has('protege_met') && !c.has('protege_goal') && c.rating >= 7.0,
      text: '{protege} scored his first senior goal from your pass. He ran to you, not the fans. You pushed him towards the fans.',
      sets: ['protege_goal'],
    });
    S('LDR-04', {
      title: 'Peacekeeper', when: 'season', trig: 'Captain, any season, random',
      if: (c) => c.captain && c.rnd(0.4),
      text: 'Two team-mates had a shouting match at half-time. You stood between them and said the only thing that worked: “Whoever wins this argument loses the game.” They both laughed. You won 2–1.',
    });
    S('LDR-05', {
      title: 'Bonus for the kit room', when: 'season', trig: 'Captain in a trophy season', tone: 'warm',
      if: (c) => c.captain && c.trophies > 0 && !c.has('kitroom_bonus'),
      text: 'You persuaded the squad to share part of the trophy bonus with the kit room, the groundstaff and the canteen. {kitman} spent theirs on a holiday they had been planning for nine years.',
      sets: ['kitroom_bonus'], fx: { aff: { kitman: 2 } },
    });
    S('LDR-06', {
      title: 'They call you boss', when: 'season', trig: 'Age 30+, five or more seasons played', tone: 'funny',
      if: (c) => c.age >= 30 && c.total >= 5 && !c.has('called_boss'),
      text: 'The young players started calling you “boss”. You tried to stop it. It got worse: one of them now calls you “gaffer”, and the actual gaffer is not amused.',
      sets: ['called_boss'],
    });
    S('LDR-07', {
      title: 'Night school', when: 'season', trig: 'Age 30+, after studying the game while injured, or random',
      if: (c) => c.age >= 30 && !c.has('badges') && (c.has('studied_game') || c.rnd(0.3)),
      text: 'You started your coaching badges at night, in a classroom with ten other players. Your first assignment was a session plan. You based it on {coach}’s, word for word, and got the highest mark in the group.',
      sets: ['badges'],
    });
    S('LDR-08', {
      title: 'Sunday dinners', when: 'season', trig: 'Captain or senior player at a club for 3+ seasons', tone: 'warm',
      if: (c) => c.age >= 28 && c.stint >= 3 && !c.loan && c.rnd(0.4),
      text: 'You started hosting Sunday dinners for the new signings who were far from home. The rule is no football talk. The rule is broken within four minutes every time.',
    });
    S('LDR-09', {
      title: 'The pitch at home', when: 'season', trig: 'Age 27+ and a strong career so far', tone: 'warm',
      if: (c) => c.age >= 27 && c.trophiesTotal >= 3 && !c.has('hometown_pitch'),
      text: 'You paid for a new all-weather pitch in {hometown}, next to the patch of grass where you learned to play. The kids voted to name it. They chose your nickname, not your name.',
      sets: ['hometown_pitch'],
    });
    S('LDR-10', {
      title: 'The phone call you make', when: 'season', trig: 'Age 30+, a team-mate is struggling, random',
      if: (c) => c.age >= 30 && c.rnd(0.3) && !c.has('pay_it_forward'),
      text: 'A young team-mate was dropped and went quiet. You took him for a coffee and listened for an hour. Then you heard yourself say: “Benches are for sitting, not sulking.”',
      sets: ['pay_it_forward'],
    });
