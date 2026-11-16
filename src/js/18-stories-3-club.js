    /* ---------- CLB · Life at a club ---------- */
    S('CLB-01', {
      title: 'The group chat', when: 'season', trig: 'First season at a new club', tone: 'funny',
      if: (c) => c.first && !c.loan && c.total >= 2,
      text: 'You were added to the {club} squad group chat at 2am. By breakfast there were 312 messages, a photo of {kitman} asleep on the team bus and a vote on whether you could stay. It passed 19–3.',
    });
    S('CLB-02', {
      title: 'A new role on the board', when: 'season', trig: 'First season under a new manager, average rating under 7.0', tone: 'drama',
      if: (c) => c.first && !c.loan && c.rating < 7.0,
      text: '{gaffer} drew you on the tactics board somewhere you had never played. “Trust me for six weeks,” they said.',
      choices: [
        { label: 'Trust them', desc: 'Learn the new role properly.', out: 'It felt wrong for a month and right for the rest of the season. {gaffer} remembers who listened.', fx: { form: 0.05, aff: { gaffer: 1 } }, sets: ['trusted_gaffer'] },
        { label: 'Ask to play your way', desc: 'Your best football comes from your best position.', out: '{gaffer} agreed, with a look that said “prove it”.', fx: { aff: { gaffer: -1 } } },
      ],
    });
    S('CLB-03', {
      title: 'Pre-season hill', when: 'season', trig: 'Any season, random', tone: 'funny', w: 0.6,
      if: (c) => !c.loan && c.rnd(0.3),
      text: 'Pre-season included a hill. Everyone has a story about the hill. Yours is that {captain} was sick at the top, then ran it again to prove a point, then was sick again.',
    });
    S('CLB-04', {
      title: 'Cards on the bus', when: 'season', trig: 'Any season at a club, random', tone: 'funny', w: 0.6,
      if: (c) => !c.loan && c.stint >= 2 && c.rnd(0.3),
      text: 'The away-day card school has one rule: never let {captain} deal. You found out why after losing a week of coffee money on a six-hour coach trip.',
    });
    S('CLB-05', {
      title: 'Fancy dress', when: 'season', trig: 'First season at a club', tone: 'funny',
      if: (c) => c.first && !c.loan && c.rnd(0.5),
      text: 'The Christmas party theme was “your hero”. Three players came as {gaffer}.',
      choices: [
        { label: 'Go as {coach}', desc: 'The tracksuit, the whistle, the speech.', out: 'You sent {coach} the photo. They printed it and put it on the fridge.', fx: { aff: { coach: 1 } } },
        { label: 'Go as {kitman}', desc: 'A bag of 40 bibs and a frown.', out: '{kitman} pretended to be offended and then wore your costume the next day.', fx: { aff: { kitman: 1 } }, sets: ['kitman_costume'] },
      ],
    });
    S('CLB-06', {
      title: 'They sing your name', when: 'season', trig: 'Fans adore you (mood 70+) and a strong season', tone: 'proud',
      if: (c) => !c.loan && c.mood >= 70 && c.rating >= 7.3 && !c.has('fan_song'),
      text: 'The {club} fans made you a song, set to an old pop chorus nobody under 40 remembers. It has one rhyme for {surname} and it isn’t a good one. You hum it in the shower.',
      sets: ['fan_song'],
    });
    S('CLB-07', {
      title: 'The boos', when: 'season', trig: 'Fans have turned (mood under 30)', tone: 'drama',
      if: (c) => !c.loan && c.mood < 30,
      text: 'They booed when your name was read out. On the way home, a kid at a petrol station asked for an autograph anyway and said their dad “doesn’t mean it”.',
      choices: [
        { label: 'Win them back on the pitch', desc: 'Say nothing. Run more.', out: 'You covered more ground than anyone the next month. The boos got quieter.', fx: { mood: 6, form: 0.03 } },
        { label: 'Talk to the supporters’ group', desc: 'Show up and listen.', out: 'Two hours in a function room. Nobody changed their mind, but everybody shook your hand.', fx: { mood: 8 } },
      ],
    });
    S('CLB-08', {
      title: 'The speech', when: 'season', trig: 'A season with a trophy and you are captain', tone: 'proud',
      if: (c) => c.captain && c.trophies > 0,
      text: 'Before the decisive game you were meant to give a speech. You forgot every word. You said “for {parent}, for {kitman}, for the bus” and the room went up like a goal.',
    });
    S('CLB-09', {
      title: 'Against the old shirt', when: 'season', trig: 'Your previous club is in your current league', tone: 'drama',
      if: (c) => c.prevSameLeague && c.first && c.stat > 0,
      text: 'You scored against {prevClub}. The away end you used to stand in front of went quiet.',
      choices: [
        { label: 'Don’t celebrate', desc: 'Hands up, eyes down.', out: 'The away end applauded you off at the end. {prevKitman} texted a heart.', fx: { aff: { journo: 1 } }, sets: ['respected_old_club'] },
        { label: 'Celebrate', desc: 'You play for {club} now.', out: 'Your new fans loved it. Your old ones wrote you a long post about it.', fx: { mood: 5 } },
      ],
    });
    S('CLB-10', {
      title: 'Their office door', when: 'season', trig: 'Second season under the same manager, rating 7.4+', tone: 'warm',
      if: (c) => !c.loan && c.stint === 2 && c.rating >= 7.4 && !c.has('mentor_gaffer'),
      text: '{gaffer} started leaving their office door open when you walked past. Then it was coffee. Then it was “What would you do here?” about a video clip. You realised they were teaching you.',
      sets: ['mentor_gaffer'], fx: { aff: { gaffer: 2 } },
    });
    S('CLB-11', {
      title: 'Wrong stadium', when: 'season', trig: 'Any season, random', tone: 'funny', w: 0.5,
      if: (c) => !c.loan && c.rnd(0.25),
      text: 'Your satnav took you to the wrong ground on matchday: your city rivals’. You were fined for being late. {kitman} has since laminated a map and taped it to your locker.',
    });
    S('CLB-12', {
      title: 'The ball kid', when: 'season', trig: 'Age 25–27, after you met the superfan at your debut',
      needs: ['met_superfan'], if: (c) => c.has('met_superfan') && c.age >= 25 && c.age <= 27 && !c.loan && !c.has('superfan_ballkid'),
      text: 'A ball kid threw you the ball so fast you took a quick throw and the team scored. After the game they introduced themselves: {superfan}. “Row F,” they said. “I had a sign.”',
      sets: ['superfan_ballkid'],
    });
    S('CLB-13', {
      title: 'School visit', when: 'season', trig: 'Any season, random', w: 0.6,
      if: (c) => !c.loan && c.rnd(0.3),
      text: 'The club sent you to a primary school for an afternoon. A seven-year-old beat you at keepy-uppy, 23 to 19, and has told the story every day since. You have demanded a rematch.',
    });
    S('CLB-14', {
      title: 'Penalty politics', when: 'season', trig: 'Attacker, strong season', tone: 'funny',
      if: (c) => c.isAtt && !c.loan && c.stat >= 12 && c.rnd(0.5),
      text: 'You and {captain} both grabbed the ball for a penalty. {gaffer} settled it with rock-paper-scissors in front of 40,000 people. You lost. He scored. You still say he went early.',
    });
    S('CLB-15', {
      title: 'The lucky boots', when: 'season', trig: 'A great season (rating 7.6+)', tone: 'funny',
      if: (c) => !c.loan && c.rating >= 7.6 && !c.has('kitman_lucky_boots'),
      text: '{kitman} decided your boots were lucky and refused to let you change them. They have been glued twice and smell like a cellar. You are not allowed to talk about it.',
      sets: ['kitman_lucky_boots'],
    });
    S('CLB-16', {
      title: 'Framed before full-time', when: 'season', trig: 'You broke a club record', tone: 'proud',
      if: (c) => c.ev('CLUB_RECORD'),
      text: '{kitman} had the record-breaking ball out of play and in a frame before the final whistle. Nobody knows how. The frame was already engraved.',
      sets: ['record_ball'],
    });
    S('CLB-17', {
      title: 'No voice left', when: 'season', trig: 'Promotion won', tone: 'proud',
      if: (c) => c.ev('PROMOTED'),
      text: 'Promotion. The open-top bus did six miles in three hours. You lost your voice by the second roundabout and spent the evening communicating in thumbs.',
      sets: ['promotion_bus'],
    });
    S('CLB-18', {
      title: 'Clapped off anyway', when: 'season', trig: 'Relegated', tone: 'drama',
      if: (c) => c.ev('RELEGATED') && !c.loan,
      text: 'Relegation. The fans clapped you off anyway. In the tunnel {gaffer} said nothing at all, which was worse than shouting.',
      choices: [
        { label: 'Promise to stay and fix it', desc: 'Say it to the cameras.', out: 'The clip went everywhere. Now you have to mean it.', fx: { mood: 10 }, sets: ['stayed_after_relegation'] },
        { label: 'Say nothing yet', desc: 'Emotions first, decisions later.', out: 'Sensible. Quiet. The fans noticed the quiet.' },
      ],
    });
    S('CLB-19', {
      title: 'Sewn by hand', when: 'season', trig: 'Made club captain', tone: 'proud',
      if: (c) => c.ev('CAPTAIN'),
      text: 'The club gave you an armband. {parent} sent another one, hand-sewn, with your initials on the inside. You wear theirs.',
      sets: ['parent_armband'],
    });
    S('CLB-20', {
      title: 'The canteen', when: 'season', trig: 'Four or more seasons at the same club', tone: 'warm',
      if: (c) => !c.loan && c.stint === 4,
      text: 'Four seasons in, the canteen staff stopped asking what you want. They just put it on the tray. It’s the first time a club has felt like a kitchen at home.',
    });
    S('CLB-21', {
      title: 'Training-ground cat', when: 'season', trig: 'Any season, random', tone: 'funny', w: 0.4,
      if: (c) => !c.loan && c.rnd(0.2) && !c.has('cat'),
      text: 'A stray cat adopted the {club} training ground and chose your car bonnet as its bed. The squad named it after you. It has more followers than you do.',
      sets: ['cat'],
    });
