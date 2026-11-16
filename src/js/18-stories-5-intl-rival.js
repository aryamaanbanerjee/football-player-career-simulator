    /* ---------- INT · International duty ---------- */
    S('INT-01', {
      title: 'The call-up', when: 'season', trig: 'Your first senior international cap', tone: 'proud',
      if: (c) => c.ev('INTL_CAP') && !c.has('first_cap'),
      text: 'The call-up came by email, which felt wrong for something so big. You read it out loud to {parent} on the phone. There was a long silence, then the sound of them telling the neighbours through the window.',
      sets: ['first_cap'],
    });
    S('INT-02', {
      title: 'The anthem', when: 'season', trig: 'First international season', tone: 'warm',
      if: (c) => c.ev('INTL_CAP') && c.caps <= 8 && !c.has('anthem'),
      text: 'You had sung the {nation} anthem a thousand times in the car. On the pitch you forgot the second verse and mumbled. The camera found {parent} in the stand, word perfect and crying.',
      sets: ['anthem'],
    });
    S('INT-03', {
      title: 'First shirt', when: 'season', trig: 'First international cap',
      if: (c) => c.ev('INTL_CAP') && c.has('first_cap') && !c.has('first_shirt_given'),
      text: 'Your first {nation} shirt had to go to someone.',
      choices: [
        { label: 'Give it to {coach}', desc: 'Where it started.', out: '{coach} hung it in the academy corridor, next to the wall you used to kick balls against.', fx: { aff: { coach: 1 } }, sets: ['coach_has_shirt'] },
        { label: 'Give it to {parent}', desc: 'The first fan.', out: 'It went on the wall in the hallway. Visitors are walked past it twice.', sets: ['parent_has_shirt'] },
        { label: 'Give it to {sibling}', desc: 'They’ll grow into it.', out: '{sibling} wore it to school every day for a month.', sets: ['sibling_has_shirt'] },
      ],
      sets: ['first_shirt_given'],
    });
    S('INT-04', {
      title: 'Left out', when: 'season', trig: 'Left out of a tournament squad', tone: 'drama',
      if: (c) => c.ev('INTL_SNUB'),
      text: 'Your name wasn’t on the list. {journo} called it “the selection mistake of the year”, which helped a little. {coach} sent a photo of the academy wall with a ball against it. No message. None needed.',
      sets: ['snubbed_once'],
    });
    S('INT-05', {
      title: 'Room 214', when: 'season', trig: 'Selected for a tournament', tone: 'funny',
      if: (c) => c.tour && c.tour.calledUp && !c.has('tour_room'),
      text: 'At the {tourName} your room-mate snored like a lawnmower and set three alarms for 6am. On the last night he gave you his tournament bag “for luck”. You still don’t know what was in the side pocket.',
      sets: ['tour_room'],
    });
    S('INT-06', {
      title: 'The whole town', when: 'season', trig: 'Winning an international tournament', tone: 'proud',
      if: (c) => c.ev('INTL_GLORY'),
      text: 'Someone sent you a video from {hometown}: the whole square in your colours, a screen on the side of the bakery, {parent} on someone’s shoulders. You watched it on the team bus on a loop.',
      sets: ['hometown_square'], fx: { mood: 5 },
    });
    S('INT-07', {
      title: 'Twelve yards', when: 'season', trig: 'In a tournament squad that didn’t win, random', tone: 'drama',
      if: (c) => c.tour && c.tour.calledUp && !c.tour.won && c.rnd(0.4),
      text: 'Out on penalties. You scored yours; it didn’t matter. On the flight home the youngest player in the squad sat next to you and you told him what {coach} told you at 15: “The ones who miss are the ones brave enough to step up.”',
    });
    S('INT-08', {
      title: 'The armband', when: 'season', trig: 'Made national team captain', tone: 'proud',
      if: (c) => c.ev('NATIONAL_CAPTAIN'),
      text: 'The {nation} manager asked you to lead the team out. {parent} rang everyone they had ever met. {sibling} rang everyone at school.',
      sets: ['national_captain_story'],
    });
    S('INT-09', {
      title: 'One hundred', when: 'season', trig: 'Reaching 100 international caps', tone: 'proud',
      if: (c) => c.caps >= 100 && !c.has('cap100'),
      text: 'Cap number 100. They gave you a gold cap in a glass box before kick-off. You looked for {coach} in the crowd, and there they were, in the same coat they wore at youth games.',
      sets: ['cap100'],
    });
    S('INT-10', {
      title: 'Same side', when: 'season', trig: 'You and your rival play for the same country', tone: 'funny',
      if: (c) => c.ev('INTL_CAP') && c.rivalSameNation && !c.has('rival_roommates'),
      text: 'The national team put you and {rival} in the same hotel room. Neither of you will talk about the first night. By the end of the camp you were arguing about the TV remote like brothers.',
      sets: ['rival_roommates'],
    });
    S('INT-11', {
      title: 'Jet lag', when: 'season', trig: 'Playing abroad while on international duty', tone: 'funny',
      if: (c) => c.ev('INTL_CAP') && c.abroad && c.rnd(0.4),
      text: 'Fourteen hours of travel to play for {nation}, then fourteen hours back for a league game. You fell asleep in the dressing room with one boot on. {kitman} put a blanket over you and told {gaffer} you were “meditating”.',
    });
    S('INT-12', {
      title: 'Last time in the shirt', when: 'season', trig: 'Age 33+ with 40+ caps', tone: 'warm',
      if: (c) => c.age >= 33 && c.caps >= 40 && !c.has('intl_farewell'),
      text: 'You told the national manager this camp would be your last. In your final game they subbed you off in the 88th minute so the stadium could stand. The young players formed a tunnel to the bench.',
      sets: ['intl_farewell'],
    });
    S('INT-13', {
      title: 'The promise kept', when: 'season', trig: 'Selected for a tournament after missing one injured', tone: 'proud',
      needs: ['next_tournament_promise'], if: (c) => c.has('next_tournament_promise') && c.tour && c.tour.calledUp && !c.has('promise_kept'),
      text: 'Four years ago you watched from a sofa with your leg on a cushion. This time you walked out. {sibling} sent a photo of the same cushion, on the same sofa, with a {nation} flag on it.',
      sets: ['promise_kept'],
    });

    /* ---------- RIV · The rivalry ---------- */
    S('RIV-01', {
      title: 'Under-15s', when: 'season', trig: 'First season, your rival exists', tone: 'warm',
      if: (c) => c.rival && c.total === 1,
      text: 'You first played against {rival} at an under-15 tournament. He nutmegged you in the first minute and you have not forgotten it. He says he doesn’t remember, which is worse.',
      sets: ['rival_nutmeg'],
    });
    S('RIV-02', {
      title: 'His golden night', when: 'season', trig: 'Your rival wins the Ballon d’Or', tone: 'drama',
      if: (c) => c.ev('RIVAL_BDO'),
      text: '{rival} won the Ballon d’Or. You watched the ceremony with the sound off. Then you turned it on for his speech, and he thanked “the player who pushed me most”. He didn’t say your name. He didn’t need to.',
      sets: ['rival_speech'],
    });
    S('RIV-03', {
      title: 'Your year', when: 'season', trig: 'A season where you clearly outshone your rival', tone: 'proud',
      if: (c) => c.rival && !c.rivalBetter && c.rating >= 7.5 && c.rnd(0.5),
      text: '{journo}’s end-of-season column put your name above {rival}’s for the first time. {sibling} printed it, highlighted your name and stuck it to the bathroom mirror.',
    });
    S('RIV-04', {
      title: 'Same dressing room', when: 'season', trig: 'Your rival plays at your club', tone: 'funny',
      if: (c) => c.rivalHere && !c.has('rival_teammate'),
      text: 'Sharing a dressing room with {rival} was awkward for exactly one week. Then you both found out you hate the same song the captain plays before every game. Unity.',
      sets: ['rival_teammate'],
    });
    S('RIV-05', {
      title: 'The interview', when: 'season', trig: 'Your rival had the better season, random', tone: 'drama',
      if: (c) => c.rival && c.rivalBetter && c.rnd(0.4),
      text: '{journo} asked whether {rival} is better than you. Live on camera.',
      choices: [
        { label: '“This season, yes”', desc: 'Honest and generous.', out: 'It was the most shared clip of the week. {rival} liked it, then unliked it, then liked it again.', fx: { aff: { journo: 1 } }, sets: ['rival_respect'] },
        { label: '“Ask me in May”', desc: 'A grin, a challenge.', out: 'Back pages loved it. Training was a little sharper that week.', fx: { form: 0.03 } },
      ],
    });
    S('RIV-06', {
      title: 'A chess game', when: 'season', trig: 'Your career stat total is close to your rival’s', tone: 'funny',
      if: (c) => c.rival && c.total >= 6 && c.statClose && c.rnd(0.5),
      text: 'Fans built a website that tracks you and {rival} side by side, updated after every game. You claim you never look at it. Your phone’s search history disagrees.',
    });
    S('RIV-07', {
      title: 'Dinner after', when: 'season', trig: 'After a tournament with your rival, random', tone: 'warm',
      if: (c) => c.rival && c.tour && c.tour.calledUp && c.rnd(0.35) && !c.has('rival_dinner'),
      text: 'After the tournament you ended up at the same restaurant as {rival}. You ate at separate tables for ten minutes, then he pulled up a chair. You talked about your families until they closed.',
      sets: ['rival_dinner'],
    });
    S('RIV-08', {
      title: 'Grey hairs', when: 'season', trig: 'Age 32+, your rival still playing', tone: 'funny',
      if: (c) => c.rival && c.age >= 32 && !c.has('rival_grey'),
      text: '{rival} posted a photo of his first grey hair and tagged you: “Your turn.” You already had three.',
      sets: ['rival_grey'],
    });
    S('RIV-09', {
      title: 'One emoji', when: 'season', trig: 'You won a major trophy and your rival didn’t, random', tone: 'proud',
      if: (c) => c.rival && c.major && c.rivalTrophies === 0 && c.rnd(0.5),
      text: 'You lifted the trophy. In the tunnel afterwards there was a text from {rival}: one trophy emoji, then “Next year’s mine.” You saved it.',
    });
