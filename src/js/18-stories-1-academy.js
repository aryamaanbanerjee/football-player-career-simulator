    /* ---------- ACA · Academy and breakthrough (ages 16–19) ---------- */
    S('ACA-01', {
      title: 'The drive to sign', when: 'window', trig: 'Signing the first professional contract',
      if: (c) => c.kind === 'FIRST_CONTRACT',
      text: '{coach} drove you to {club} to sign, the same rattling car that took you to every youth game. In the car park they said one thing: “Don’t change your boots for a sponsor until you’ve earned it.”',
      sets: ['coach_boots_advice'],
    });
    S('ACA-02', {
      title: 'Two beds, one promise', when: 'window', trig: 'First contract signed; your academy best mate did not get one',
      if: (c) => c.kind === 'FIRST_CONTRACT',
      text: 'You and {mate} shared digs for three years. Today you signed and {mate} got a handshake and a release letter. That night you sat on the bunk beds eating cereal, not saying much.',
      choices: [
        { label: 'Make a promise', desc: 'If you ever play each other, you swap shirts.', out: 'You shook on it like you were twelve again. {mate} said he’d hold you to it.', fx: { aff: { mate: 1 } }, sets: ['promised_mate_shirt'] },
        { label: 'Tell him he’ll make it', desc: 'Lower leagues are full of late bloomers.', out: '{mate} rolled his eyes, then asked you to say it again.', fx: { aff: { mate: 1 } }, sets: ['mate_believed'] },
      ],
    });
    S('ACA-03', {
      title: 'The mint', when: 'season', trig: 'First season as a pro, at least one appearance', tone: 'funny',
      if: (c) => c.total === 1 && c.apps > 0,
      text: 'You were sick in the toilets ten minutes before your debut. {kitman} handed you a mint without a word, then whispered that the captain does the same thing every week.',
      sets: ['kitman_mint'],
    });
    S('ACA-04', {
      title: 'The pie queue', when: 'season', trig: 'First season with a goal (or a clean sheet for keepers and defenders)', tone: 'funny',
      if: (c) => c.total <= 2 && c.stat > 0 && !c.has('first_stat_done'),
      text: '{parent} missed your first senior {firstStat}. They were in the queue for a pie. They have since watched the replay 41 times and tell everyone they “felt it coming”.',
      sets: ['first_stat_done', 'pie_queue'],
    });
    S('ACA-05', {
      title: 'Told you', when: 'season', trig: 'Attacker under 21 with 5+ goals in a season',
      if: (c) => c.isAtt && c.age <= 20 && c.stat >= 5 && !c.has('weak_foot'),
      text: 'One of your goals this season came off your weaker foot, the one {coach} made you practise against the academy wall until it was dark. Your phone buzzed before you’d left the pitch. One word: “Told you.”',
      sets: ['weak_foot'], fx: { aff: { coach: 1 } },
    });
    S('ACA-06', {
      title: 'Row F', when: 'season', trig: 'First or second season, any role',
      if: (c) => c.total <= 2 && c.apps > 0 && !c.has('met_superfan'),
      text: 'There is a kid in row F with a cardboard sign: “{surname} {num} — FUTURE LEGEND”. Their name is {superfan}. They are nine. You waved; they nearly fell over.',
      sets: ['met_superfan'],
    });
    S('ACA-07', {
      title: 'Benches are for sitting', when: 'season', trig: 'Under 20 and fewer than 12 appearances', tone: 'drama',
      if: (c) => c.age <= 19 && c.apps < 12 && !c.loan,
      text: 'A season of warm-ups and no minutes. {coach} took you for a coffee and listened for an hour. Then: “Benches are for sitting, not sulking. What are you going to do about it?”',
      choices: [
        { label: 'Extra sessions', desc: 'Stay behind with the under-23s every day.', out: 'You were last off the training pitch for months. The staff noticed.', fx: { form: 0.05, aff: { coach: 1 } }, sets: ['grafter'] },
        { label: 'Ask about a loan', desc: 'Games somewhere else beat watching here.', out: 'The academy manager made some calls. You’re on the list.', sets: ['wants_loan'] },
        { label: 'Keep your head down', desc: 'Your chance will come.', out: '{coach} nodded. “Patience is a skill too.”' },
      ],
    });
    S('ACA-08', {
      title: 'The lyric', when: 'season', trig: 'Under 21, random', tone: 'funny', w: 0.6,
      if: (c) => c.age <= 20 && c.rnd(0.35),
      text: 'You posted a song lyric after a draw. Within an hour the internet decided it was about {gaffer}. It was about your hair.',
      choices: [
        { label: 'Explain yourself', desc: 'A short, slightly embarrassed video.', out: 'The fans loved the honesty. {gaffer} sent you a laughing emoji, which was worse.', fx: { mood: 3 } },
        { label: 'Post the next line', desc: 'Commit to the bit.', out: '{journo} called it “the most confident thing a teenager has done this season”.', fx: { mood: 4, aff: { journo: 1 } } },
      ],
    });
    S('ACA-09', {
      title: 'The call to {mateClub}', when: 'season', trig: 'Age 18–19, after your best mate was released',
      if: (c) => c.age >= 18 && c.age <= 19 && !c.has('mate_signed'),
      text: '{mate} found a club: {mateClub}, a smaller club with a pitch that slopes towards one corner. He sounded happier than he had in a year.',
      choices: [
        { label: 'Call him straight away', desc: 'Tell him how proud you are.', out: 'You talked for two hours. He’s already picked out his shirt number.', fx: { aff: { mate: 1 } }, sets: ['mate_called'] },
        { label: 'Send a text', desc: 'Busy week. You’ll catch up properly later.', out: 'He replied with a thumbs-up. Later never quite came.' },
      ],
      sets: ['mate_signed'],
    });
    S('ACA-10', {
      title: 'Fifty to watch', when: 'season', trig: 'Under 21 with an average rating of 7.2+', tone: 'proud',
      if: (c) => c.age <= 20 && c.rating >= 7.2 && !c.has('journo_fan'),
      text: '{paper} named you in its “50 players to watch”. {journo} wrote that you have “a first touch you can’t coach”. {coach} cut it out and pinned it to the academy noticeboard.',
      sets: ['journo_fan'], fx: { aff: { journo: 1 } },
    });
    S('ACA-11', {
      title: 'Carry the balls', when: 'season', trig: 'First season at a club with a senior captain',
      if: (c) => c.total <= 2 && !c.loan,
      text: '{captain} made you carry the ball bags for six months. On your last day as the youngest in the squad, he gave you his old boots. “They’ve got goals in them. Don’t waste them.”',
      sets: ['captain_boots'],
    });
    S('ACA-12', {
      title: 'The washing machine', when: 'window', trig: 'First professional contract', tone: 'funny',
      if: (c) => c.kind === 'FIRST_CONTRACT',
      text: 'With your first pay packet you bought {parent} a washing machine. A big one. They still call it “the {club} machine” and show it to visitors before the kitchen.',
      sets: ['washing_machine'],
    });
    S('ACA-13', {
      title: 'A box from home', when: 'season', trig: 'First season in a league outside your home country',
      if: (c) => c.first && c.abroad && c.age <= 21,
      text: 'The first winter away was long and dark. A box arrived from {parent}: your favourite snacks, a scarf and a note that just said “eat properly”. {kitman} learned three words of your language to make you laugh. Two of them were rude.',
    });
    S('ACA-14', {
      title: 'Turbo', when: 'season', trig: 'First or second season, random', tone: 'funny', w: 0.7,
      if: (c) => c.total <= 2 && !c.has('nickname') && c.rnd(0.5),
      text: 'You set the treadmill to the wrong speed in front of the whole first team and shot off the back. By lunch the nickname had stuck: “Turbo”. Even {gaffer} uses it.',
      sets: ['nickname'],
    });
    S('ACA-15', {
      title: 'Exams and a cup tie', when: 'season', trig: 'Age 17, first season',
      if: (c) => c.age === 17,
      text: 'You sat your last school exam on the morning of a cup tie and came on for the final twenty minutes that night. You passed both. {parent} framed the exam certificate, not the match programme.',
    });
    S('ACA-16', {
      title: 'Number {num}', when: 'window', trig: 'First contract or first transfer',
      if: (c) => (c.kind === 'FIRST_CONTRACT' || (c.kind === 'TRANSFER' && c.total <= 3)) && !c.has('num_story'),
      text: '{kitman} hung up a {num} shirt with your name on it. “Last lad who wore that played four hundred games here,” they said. You looked it up. It was true.',
      sets: ['num_story'],
    });
