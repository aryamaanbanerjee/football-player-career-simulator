    /* ---------- v8 · New stories: learning the game, your best mate, your protege, promises ---------- */
    Object.assign(STORY_CATS, { TUT: 'Learning the game', MAT: 'Your best mate', PRO: 'Your protege' });

    /* TUT · the cast as tutor (guided careers only). Each explains one idea, in character, once. */
    S('TUT-01', {
      title: 'Three questions', when: 'open', trig: 'Guided career, your very first summer', tone: 'warm', w: 5,
      if: (c) => c.guided && c.total === 0 && !c.has('tut_offers'),
      text: '{agent} sat you down with the offers. “Ask three questions of every club. Will you play? Will you win? Will you be happy? Most seventeen-year-olds only ask the second one, and spend two years watching from the bench.”',
      sets: ['tut_offers'],
    });
    S('TUT-02', {
      title: 'A loan is not a step down', when: 'open', trig: 'Guided career, a loan offer on the table', tone: 'warm', w: 4,
      if: (c) => c.guided && c.hasLoan && !c.has('tut_loan'),
      text: '{coach} rang about the loan offer. “A loan isn’t a step down. Your club still owns you; you just go and play somewhere for a while. A season of real games beats a season of watching. You come back a different player.”',
      sets: ['tut_loan'],
    });
    S('TUT-03', {
      title: 'What the fee means', when: 'window', trig: 'Guided career, your first transfer with a fee', tone: 'warm', w: 4,
      if: (c) => c.guided && c.kind === 'TRANSFER' && c.fee > 0 && !c.has('tut_fee'),
      text: '{agent} explained the numbers on the drive to the medical. “The fee goes to your old club, not to you. It’s roughly your market value, what the world thinks you’re worth today. It rises when you play well and falls as you get older. The wage is yours. Spend some of it on {parent}.”',
      sets: ['tut_fee'],
    });
    S('TUT-04', {
      title: 'Six-point-five', when: 'season', trig: 'Guided career, after your first season', tone: 'funny', w: 4,
      if: (c) => c.guided && c.total === 1 && !c.has('tut_rating'),
      text: '{gaffer} handed you a sheet with your average rating on it: {rating}. “Six-point-five is a decent game. Seven is a good one. Eight and they write songs about you. Nobody gets eight every week, so don’t try.”',
      sets: ['tut_rating'],
    });
    S('TUT-05', {
      title: 'Where minutes come from', when: 'season', trig: 'Guided career, a season with few games', tone: 'warm', w: 4,
      if: (c) => c.guided && c.apps < 18 && !c.loan && !c.has('tut_minutes'),
      text: '{captain} found you in the gym. “Minutes come from three things: your form, the manager’s trust, and how many players are ahead of you. You can change the first two. The third one changes on its own, usually in the summer.”',
      sets: ['tut_minutes'],
    });
    S('TUT-06', {
      title: 'Everyone gets injured', when: 'season', trig: 'Guided career, your first injury', tone: 'warm', w: 4,
      if: (c) => c.guided && c.injured && !c.has('tut_injury'),
      text: '{kitman} brought you a tea in the treatment room. “Every player gets injured. Every single one. The ones people remember are the ones who come back. You’ll come back.”',
      sets: ['tut_injury'],
    });
    S('TUT-07', {
      title: 'One cap', when: 'season', trig: 'Guided career, your first international call-up', tone: 'proud', w: 4,
      if: (c) => c.guided && c.caps >= 1 && !c.has('tut_caps'),
      text: '{coach} sent a long message. “Every game for your country is called a cap, because a hundred years ago they actually gave you one. Collect enough and you get to play in the {tourName}. Wear it properly.”',
      sets: ['tut_caps'],
    });
    S('TUT-08', {
      title: 'The list', when: 'season', trig: 'Guided career, your first Ballon d’Or nomination', tone: 'proud', w: 4,
      if: (c) => c.guided && c.bd && !c.has('tut_bd'),
      text: '{journo} called before it went public. “You’re on the Ballon d’Or list. It’s the award for the best player in the world, voted by journalists like me. You finished {bdRank}. Next year, people will be watching.”',
      sets: ['tut_bd'],
    });
    S('TUT-09', {
      title: 'Down a level', when: 'season', trig: 'Guided career, your club is relegated', tone: 'warm', w: 4,
      if: (c) => c.guided && c.secondTier && !c.has('tut_releg'),
      text: '{gaffer} gathered everyone in the canteen. “The bottom teams drop a division every year. That’s relegation. This year it’s us. Win enough next season and we go straight back up. Some of the best careers have a year like this in them.”',
      sets: ['tut_releg'],
    });
    S('TUT-10', {
      title: 'The last summer', when: 'open', trig: 'Guided career, your final transfer window', tone: 'warm', w: 4,
      if: (c) => c.guided && c.final && !c.has('tut_final'),
      text: '{agent} brought cake to the meeting. “This is your last window. After this season, you retire. Think about where you want to finish, not where you want to be paid. People remember the last club.”',
      sets: ['tut_final'],
    });

    /* MAT · your best mate has his own career */
    S('MAT-01', {
      title: 'Twice a season', when: 'season', trig: 'Your best mate’s club is in your league for the first time', tone: 'funny', w: 3,
      if: (c) => c.mateMeet && !c.has('mate_met_league'),
      text: '{mate}’s {mateClub} played {club} twice this season: {mateResults}. He texted after the second game: a photo of the scoreboard and no words at all.',
      sets: ['mate_met_league'], fx: { aff: { mate: 1 } },
    });
    S('MAT-02', {
      title: 'A new locker', when: 'season', trig: 'Your best mate moves to a bigger club', tone: 'proud', w: 3,
      if: (c) => c.mateMovedUp && !c.has('mate_moved_up'),
      text: '{mate} signed for {mateClub}. He sent a photo of his new locker. Taped inside the door, already, was the photo of the two of you on the academy bunk beds.',
      sets: ['mate_moved_up'], fx: { aff: { mate: 1 } },
    });
    S('MAT-03', {
      title: 'Same cereal', when: 'season', trig: 'Your best mate joins your club', tone: 'warm', w: 5,
      if: (c) => c.mateTeammate && !c.has('mate_teammate'),
      text: '{mate} signed for {club}. Team-mates again, years after the bunk beds. On his first morning he put a box of the same cereal on your peg.',
      sets: ['mate_teammate'], fx: { aff: { mate: 1 }, mood: 3 },
    });
    S('MAT-04', {
      title: 'He scored, of course', when: 'season', trig: 'Your best mate retires', tone: 'warm', w: 4,
      if: (c) => c.mateRetired && !c.has('mate_retired'),
      text: '{mate} played his last game for {mateClub}. You watched it on your phone in a hotel corridor. He scored. Of course he scored. You were the first message on his phone.',
      sets: ['mate_retired'],
    });
    S('MAT-05', {
      title: 'Up we go', when: 'season', trig: 'Your best mate wins promotion', tone: 'proud', w: 3,
      if: (c) => c.matePromoted && !c.has('mate_promoted'),
      text: '{mate}’s {mateClub} won promotion. He sent you a video from the open-top bus, singing, badly, a song about himself that he clearly wrote.',
      sets: ['mate_promoted'],
    });

    /* PRO · your protege grows up */
    S('PRO-01', {
      title: 'Touch your toes twice', when: 'season', trig: 'Your protege signs for a big club', tone: 'proud', w: 4,
      needs: ['protege_met'], if: (c) => c.proMoved && !c.has('pro_moved'),
      text: '{protege} signed for {proClub}. Before the medical he called to ask what to say. You told him the only advice you had: touch your toes twice, just to be safe.',
      sets: ['pro_moved'],
    });
    S('PRO-02', {
      title: 'The thirteenth minute', when: 'season', trig: 'You play against your protege', tone: 'funny', w: 4,
      needs: ['pro_moved'], if: (c) => c.proMeet && !c.has('pro_met'),
      text: 'You played against {protege} for the first time. He nutmegged you in the 12th minute and apologised in the 13th. You told him never to apologise for that again.',
      sets: ['pro_met'],
    });
    S('PRO-03', {
      title: 'Still folded', when: 'season', trig: 'Your protege wins his first cap', tone: 'proud', w: 3,
      needs: ['protege_met'], if: (c) => c.proCapped && !c.has('pro_capped'),
      text: '{protege} won his first cap. He sent you a photo of the shirt, still folded, with a note: “Who do I give this to?” You told him. He gave it to his mum.',
      sets: ['pro_capped'],
    });

    /* Promises and choices about who you are */
    S('OFF-18', {
      title: 'The square', when: 'season', trig: 'Age 19–26, before any big trophy', tone: 'warm',
      if: (c) => c.age >= 19 && c.age <= 26 && c.trophiesTotal === 0 && !c.has('square_asked') && c.rnd(0.35),
      text: 'You went back to your hometown for a weekend. A group of kids followed you across the square asking when you’d bring a trophy home to show them.',
      choices: [
        { label: 'Promise them one', desc: 'Out loud, in front of everyone.', out: 'The kids cheered. One of them wrote it on the wall in chalk. It rained an hour later, but they remember.', sets: ['promise_hometown'], fx: { mood: 3 } },
        { label: '“I’ll try my best”', desc: 'Honest, if less exciting.', out: 'One of them said “that’s what they all say”. He was nine. He was right.' },
      ],
      sets: ['square_asked'],
    });
    S('OFF-19', {
      title: 'When I’m older', when: 'season', trig: 'Your sibling is 11–14', tone: 'warm',
      if: (c) => c.siblingAge >= 11 && c.siblingAge <= 14 && !c.has('sibling_asked') && c.rnd(0.5),
      text: '{sibling} asked, very casually, whether you would come and watch their games when they were older. They did not look up from their phone while asking.',
      choices: [
        { label: 'Promise every big one', desc: 'Whatever the fixture list says.', out: '{sibling} said “OK” and went back to their phone. Later {parent} told you they’d smiled for an hour.', sets: ['promise_sibling_game'], fx: { aff: { sibling: 1 } } },
        { label: '“Beat me first”', desc: 'Keep them hungry.', out: '{sibling} challenged you to a penalty shootout in the garden. You lost 5–4. You are still not sure you meant to.', fx: { aff: { sibling: 1 } } },
      ],
      sets: ['sibling_asked'],
    });
    S('TRN-21', {
      title: 'The door', when: 'window', trig: 'Leaving your first club for the first time', tone: 'warm', w: 2,
      if: (c) => c.kind === 'TRANSFER' && c.leavingBoyhood && !c.has('left_boyhood'),
      text: 'On your last day at {prevClub}, {prevKitman} walked you to the door of the training ground and held it open, like they had every morning since you were twelve.',
      choices: [
        { label: '“I’ll be back one day”', desc: 'A promise to the place that made you.', out: '{prevKitman} said, “I’ll keep the peg.” They put a strip of tape over your name instead of peeling it off.', sets: ['promise_return'] },
        { label: 'Just say thank you', desc: 'No promises, just gratitude.', out: 'You said thank you. They said, “Go on, then.” Neither of you said anything else, and that was right.' },
      ],
      sets: ['left_boyhood'],
    });
    S('CLB-22', {
      title: 'Bus karaoke', when: 'season', trig: 'Any season at a club, random', tone: 'funny',
      if: (c) => !c.loan && c.stint >= 2 && !c.has('karaoke') && c.rnd(0.2),
      text: 'Long away trip. Someone set up karaoke on the team bus, and the squad turned to the newest senior player to go first: you.',
      choices: [
        { label: 'Give it everything', desc: 'A power ballad, with actions.', out: 'It went on social media by the evening. Away fans sang it back at you for two seasons.', fx: { mood: 4 } },
        { label: 'Hand the mic to {captain}', desc: 'Let the captain lead.', out: '{captain} sang a forty-year-old song nobody knew, perfectly, and refused to explain.', fx: { aff: { captain: 1 } } },
      ],
      sets: ['karaoke'],
    });
    S('LDR-11', {
      title: 'What would you tell him?', when: 'season', trig: 'Age 28+, a young team-mate asks for advice', tone: 'warm',
      if: (c) => c.age >= 28 && !c.loan && !c.has('advice_asked') && c.rnd(0.35),
      text: 'A nineteen-year-old team-mate knocked on your hotel door the night before a big game. He couldn’t sleep, and he wanted to know how you used to deal with it.',
      choices: [
        { label: 'Tell him the truth', desc: 'You never really did.', out: 'You told him you still don’t sleep before big games. He looked relieved. You both slept fine.', fx: { form: 0.02 } },
        { label: 'Take him for a walk', desc: 'Show, don’t tell.', out: 'You walked around the hotel car park twice, talking about anything except football. He played the game of his life.', fx: { form: 0.02 } },
      ],
      sets: ['advice_asked'],
    });
    S('OFF-20', {
      title: 'Charity match', when: 'season', trig: 'Age 24+, random', tone: 'funny',
      if: (c) => c.age >= 24 && !c.has('charity_match') && c.rnd(0.2),
      text: 'You agreed to play in a charity match for the hospital in your hometown. The organisers asked how you wanted to help.',
      choices: [
        { label: 'Play in goal', desc: 'For the comedy value.', out: 'You let in seven and saved a penalty from a local radio DJ. The penalty is the only clip anyone shares.', fx: { mood: 3 } },
        { label: 'Organise the whole thing', desc: 'Calls, kits, referees, raffle.', out: 'It raised three times the target. {parent} sold raffle tickets with the energy of a transfer agent.', fx: { mood: 3 } },
      ],
      sets: ['charity_match'],
    });
