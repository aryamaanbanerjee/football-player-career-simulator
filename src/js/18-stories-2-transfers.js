    /* ---------- TRN · Transfers, agents and contracts ---------- */
    S('TRN-01', {
      title: 'Dinner interrupted', when: 'open', trig: 'Your first transfer window as a pro',
      if: (c) => c.total === 1,
      text: '{agent} rang during {parent}’s birthday dinner. “Three clubs have asked about you. Don’t get excited. Actually, get a little bit excited.”',
      choices: [
        { label: 'Let {agent} handle it', desc: 'That’s what agents are for.', out: '{agent} promised to call only with good news. They called four times before dessert.', fx: { aff: { agent: 1 } } },
        { label: 'Be in every meeting', desc: 'It’s your career.', out: '{agent} sighed and booked you a seat at every table. You learned more in a month than in three years.', fx: { aff: { agent: -1 } }, sets: ['hands_on'] },
      ],
    });
    S('TRN-02', {
      title: 'The medical', when: 'window', trig: 'Any transfer', tone: 'funny', w: 0.8,
      if: (c) => c.kind === 'TRANSFER' && c.rnd(0.6),
      text: 'At the {club} medical the doctor asked you to touch your toes. You touched them twice, just to be safe. The doctor wrote something down and you will never know what.',
    });
    S('TRN-03', {
      title: 'Eyes closed', when: 'window', trig: 'A transfer of €30M or more', tone: 'funny',
      if: (c) => c.kind === 'TRANSFER' && c.fee >= 30,
      text: 'The club photographer took 140 shots of you holding the {club} scarf. {parent} chose the one where your eyes are closed and had it printed on a mug.',
      sets: ['mug_photo'],
    });
    S('TRN-04', {
      title: 'Signed by everyone', when: 'window', trig: 'Leaving a club after 3+ seasons',
      if: (c) => c.kind === 'TRANSFER' && c.prevStint >= 3,
      text: 'On your last morning at {prevClub}, {prevKitman} handed you a pair of your old boots, signed by the whole squad. Under the laces: “Come back and visit. Not as an away player.”',
      sets: ['old_boots_signed'],
    });
    S('TRN-05', {
      title: '23:52', when: 'window', trig: 'A bidding war or a release clause on deadline day', tone: 'funny',
      if: (c) => c.kind === 'TRANSFER' && (c.tag === 'BIDDING_WAR' || c.tag === 'RELEASE_CLAUSE'),
      text: 'The paperwork was signed on the bonnet of {agent}’s car at 23:52 because the club’s printer jammed. It is the most expensive thing that bonnet has ever held.',
    });
    S('TRN-06', {
      title: 'The handshake', when: 'window', trig: 'Staying at a club after 3+ seasons there',
      if: (c) => c.kind === 'STAY' && c.prevStint >= 3,
      text: '{gaffer} heard you were staying before the club announced it. They found you in the canteen and shook your hand for a long time. “Good. Now we build something.”',
      sets: ['loyal_moment'], fx: { mood: 4 },
    });
    S('TRN-07', {
      title: 'Front page wages', when: 'open', trig: 'A window opens while your agent is unhappy with you (affinity −1 or lower)', tone: 'drama',
      if: (c) => c.aff('agent') <= -1 && c.total >= 2,
      text: '{paper} printed your wage demands on the back page. Only four people knew the numbers. One of them is {agent}.',
      choices: [
        { label: 'Have it out with {agent}', desc: 'Clear the air, firmly.', out: 'A long, loud call. By the end you both laughed. They swore it wasn’t them; you half believed it.', fx: { aff: { agent: 1 } } },
        { label: 'Laugh it off in public', desc: '“I’d play for less than that. Don’t tell anyone.”', out: 'The fans loved it. {agent} did not.', fx: { mood: 4, aff: { agent: -1 } } },
      ],
    });
    S('TRN-08', {
      title: 'Season tickets for life', when: 'window', trig: 'A transfer while your agent likes you (affinity +2)', tone: 'funny',
      if: (c) => c.kind === 'TRANSFER' && c.aff('agent') >= 1,
      text: '{agent} slipped one extra line into the contract: two season tickets for {parent} at every club you ever play for. “Best clause I’ve ever written,” they said, and meant it.',
      sets: ['parent_tickets'],
    });
    S('TRN-09', {
      title: 'The shirt in the wardrobe', when: 'open', trig: 'Age 22–30, not at your boyhood club, random',
      if: (c) => c.age >= 22 && c.age <= 30 && !c.atBoyhood && !c.has('boyhood_rumour') && c.rnd(0.35),
      text: '{paper} linked you with {boyhood}, the club on your bedroom wall growing up. Nothing came of it. {parent} had already bought the new home shirt “just in case”. It is still in the wardrobe, tags on.',
      sets: ['boyhood_rumour'],
    });
    S('TRN-10', {
      title: 'First words', when: 'window', trig: 'A move to a league in another country', tone: 'funny',
      if: (c) => c.kind === 'TRANSFER' && c.abroad,
      text: 'You started language lessons in your first week at {club}. The first full sentence you could say was taught by {kitman}. Your teacher asked you never to say it again.',
    });
    S('TRN-11', {
      title: 'Pizza maths', when: 'window', trig: 'A transfer fee of €50M or more', tone: 'funny',
      if: (c) => c.kind === 'TRANSFER' && c.fee >= 50,
      text: '{sibling} worked out that your transfer fee buys {pizzas} pizzas. They have asked, several times, for just one percent of them.',
    });
    S('TRN-12', {
      title: 'The moustache', when: 'window', trig: 'A move to a rival of a former club', tone: 'drama',
      if: (c) => c.kind === 'TRANSFER' && (c.tag === 'ARCH_RIVAL' || c.tag === 'RIVAL'),
      text: 'Someone painted a moustache on your mural near the {prevClub} ground. Then someone else painted it off again. Then a third person added glasses. Football, in one wall.',
      sets: ['mural_moustache'],
    });
    S('TRN-13', {
      title: 'The car they always pointed at', when: 'window', trig: 'Signing as a free agent',
      if: (c) => c.kind === 'TRANSFER' && c.free && c.total >= 3,
      text: 'No transfer fee meant a signing-on bonus. You spent part of it on the car {parent} always pointed at in traffic. They drove it to the supermarket at 12 miles an hour.',
    });
    S('TRN-14', {
      title: 'Pass the biscuits', when: 'window', trig: 'Staying after renegotiating your contract', tone: 'funny',
      if: (c) => c.kind === 'STAY' && c.renegotiated,
      text: 'Contract talks went on for five hours. The breakthrough came when the chief executive passed {agent} the last chocolate biscuit. Nobody can explain it, but both sides signed within ten minutes.',
    });
    S('TRN-15', {
      title: 'Found out on the news', when: 'window', trig: 'Your release clause is triggered', tone: 'drama',
      if: (c) => c.kind === 'TRANSFER' && c.tag === 'RELEASE_CLAUSE',
      text: 'Your old club found out the clause had been paid the same way the fans did: a notification on their phones. {prevKitman} still sent a message: “Clean your boots, they’ll judge you on that.”',
    });
    S('TRN-16', {
      title: 'Home', when: 'window', trig: 'Signing for your boyhood club', tone: 'proud',
      if: (c) => c.kind === 'TRANSFER' && c.atBoyhood,
      text: 'You signed for {boyhood} in the room where you once queued for an autograph aged seven. {parent} brought the photo of that day. The player in it now works in the club shop and asked for yours.',
      sets: ['homecoming'], fx: { mood: 8 },
    });
    S('TRN-17', {
      title: 'One last deal', when: 'open', trig: 'Your final transfer window',
      if: (c) => c.final,
      text: '{agent} came to the house instead of calling. “Last one,” they said, and put the folder on the table like it weighed more than the others.',
    });
    S('TRN-18', {
      title: 'The no', when: 'window', trig: 'Staying when a five-star club had offered', tone: 'proud',
      if: (c) => c.kind === 'STAY' && c.bigOffer,
      text: 'You turned down {bigOffer}. The word got out by lunchtime. At the next home game a banner went up in the stand behind the goal: “ONE OF US”.',
      sets: ['turned_down_giant'], fx: { mood: 10 },
    });
    S('TRN-19', {
      title: 'Same car park', when: 'window', trig: 'Returning to a former club',
      if: (c) => c.kind === 'TRANSFER' && c.returning,
      text: 'You parked in the same spot as last time out of habit. {kitman} was waiting by the door. “Took you long enough.”',
      fx: { mood: 5 },
    });
    S('TRN-20', {
      title: 'The tapping-up dinner', when: 'window', trig: 'Joining the club that approached you mid-contract', tone: 'funny',
      if: (c) => c.kind === 'TRANSFER' && c.tag === 'TAPPED_UP',
      text: 'The famous “secret” dinner with {club}’s director happened in a restaurant with a window seat. Three fans took photos. One of them asked for a selfie with both of you.',
    });
