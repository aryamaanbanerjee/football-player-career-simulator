    /* ---------- v9 · The squad around you ---------- */
    Object.assign(STORY_CATS, { SQD: 'The squad around you' });
    S('SQD-01', {
      title: 'Shown around', when: 'season', trig: 'Your first season at a new club', tone: 'warm', w: 1.5,
      if: (c) => c.hasSquad && c.first && c.total >= 2 && !c.loan && c.rnd(0.5),
      text: 'On your first day, {teamFriend} took you round the training ground: the canteen, the good parking space, the physio who doesn’t mind early starts. By Friday you were sitting together on the bus.',
      sets: ['sqd_friend'],
    });
    S('SQD-02', {
      title: 'The shirt you want', when: 'season', trig: 'Someone is ahead of you in the team', tone: 'drama', w: 1.5,
      if: (c) => c.placeRivalAhead && !c.loan && c.age <= 29 && !c.has('sqd_rival_choice') && c.rnd(0.6),
      text: '{placeRival} plays where you want to play, and the manager picks him most weeks. He is good. He is also, annoyingly, nice to you.',
      choices: [
        { label: 'Outwork him', desc: 'First in, last out, every day.', out: 'You were in the gym before the cleaners. By spring, the manager was rotating you both. {placeRival} said, “About time.”', fx: { form: 0.03 } },
        { label: 'Learn from him', desc: 'Ask how he does it.', out: '{placeRival} showed you two habits you still use: where he looks before the ball arrives, and how he warms up his calves. Nobody had told you either.', fx: { form: 0.02 } },
      ],
      sets: ['sqd_rival_choice'],
    });
    S('SQD-03', {
      title: 'The January signing', when: 'season', trig: 'The club signs a player in your position in January', tone: 'drama', w: 2,
      if: (c) => c.janSigning && !c.has('sqd_jan_signing'),
      text: 'The club announced a January signing in your position. {placeRival} was introduced at a press conference, holding the shirt you’d wanted, and smiling at the cameras.',
      sets: ['sqd_jan_signing'],
    });
    S('SQD-04', {
      title: 'What the old man said', when: 'season', trig: 'A season with a veteran in the dressing room', tone: 'warm',
      if: (c) => c.hasSquad && !c.loan && c.age <= 24 && !c.has('sqd_veteran') && c.rnd(0.25),
      text: '{veteran}, the oldest player in the squad, sat next to you on the bus after a bad defeat and asked what you thought had gone wrong.',
      choices: [
        { label: 'Say nothing', desc: 'Listen instead.', out: 'He talked for twenty minutes about a game he lost fifteen years ago. You didn’t realise until later that he was talking about you.' },
        { label: 'Tell him honestly', desc: 'Including your own mistakes.', out: 'He nodded. “Good. Most of them blame the referee.” He has saved you a seat on the bus ever since.' },
      ],
      sets: ['sqd_veteran'],
    });
    S('SQD-05', {
      title: 'Somewhere new in January', when: 'season', trig: 'You went on loan in the January window', tone: 'warm', w: 2,
      if: (c) => c.hasSquad && c.janLoan,
      text: 'You arrived at {janLoanClub} with one bag and a borrowed coat. You played the first weekend. By March the kit man knew how you liked your socks.',
      sets: ['sqd_janloan'],
    });
