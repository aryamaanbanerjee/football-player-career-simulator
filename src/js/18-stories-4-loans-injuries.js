    /* ---------- LON · Loans and lower leagues ---------- */
    S('LON-01', {
      title: 'Mud to the ankles', when: 'season', trig: 'A season on loan',
      if: (c) => c.loan && !c.has('loan_mud'),
      text: 'Your first training session at {loanClub} was on a pitch that was mostly puddle. A centre-back twice your age welcomed you by flattening you in the first minute, then helped you up and asked where you’d bought your boots.',
      sets: ['loan_mud'],
    });
    S('LON-02', {
      title: 'The spare room', when: 'season', trig: 'A season on loan, random',
      if: (c) => c.loan && c.rnd(0.6),
      text: 'You lodged with a retired couple who had housed loan players for 20 years. Their fridge is covered in photos of the ones who made it. They have already cleared a space.',
      sets: ['loan_landlady'],
    });
    S('LON-03', {
      title: 'Taught to fall', when: 'season', trig: 'A season on loan with a good rating',
      if: (c) => c.loan && c.rating >= 7.0,
      text: 'Lower-league football taught you things no academy could: how to take a hit, how to waste 30 seconds at a throw-in, how to win a header against someone who works on a building site on Mondays.',
      fx: { form: 0.03 },
    });
    S('LON-04', {
      title: 'Sign him permanently', when: 'season', trig: 'Excellent season on loan (rating 7.3+)', tone: 'proud',
      if: (c) => c.loan && c.rating >= 7.3,
      text: '{loanClub}’s fans started a petition to sign you permanently. It reached 4,000 names, which is more than their average crowd. Your parent club sent a polite email.',
      sets: ['loan_hero'],
    });
    S('LON-05', {
      title: 'Face to face', when: 'season', trig: 'A loan season, after your best mate found a lower-league club',
      needs: ['mate_signed'], if: (c) => c.loan && c.has('mate_signed') && !c.has('mate_faced'),
      text: 'Your loan club drew {mateClub} away. {mate} marked you for 90 minutes and talked the whole time, mostly about your hair.',
      choices: [
        { label: 'Swap shirts at full-time', desc: 'Like you promised.', out: 'His shirt is too big and smells of liniment. It’s framed now.', fx: { aff: { mate: 1 } }, sets: ['mate_shirt_swapped'] },
        { label: 'Go for a pizza after', desc: 'Like old times.', out: 'Two hours, one pizza, no football talk. You both needed it.', fx: { aff: { mate: 1 } } },
      ],
      sets: ['mate_faced'],
    });
    S('LON-06', {
      title: 'The other league', when: 'season', trig: 'A season in the second tier after relegation', tone: 'drama',
      if: (c) => c.secondTier && !c.loan,
      text: 'The second tier means Tuesday nights, long coach trips and grounds where you can hear every word from the stand. Somebody shouted your shirt number all game. You still don’t know if it was a compliment.',
    });
    S('LON-07', {
      title: 'Back from loan', when: 'window', trig: 'Staying at your parent club after a loan season', tone: 'funny',
      if: (c) => c.kind === 'STAY' && c.wasOnLoan,
      text: 'Back at {club} after the loan, the security guard asked if you were new. {kitman} hadn’t forgotten you, though: your old peg had your name taped over it the whole time.',
    });
    S('LON-08', {
      title: 'Two thousand names', when: 'season', trig: 'A season at a 1–2 star club', tone: 'warm',
      if: (c) => !c.loan && c.stars <= 2 && c.first && c.rnd(0.6),
      text: 'There are about two thousand people at a home game here. By Christmas you knew the regulars: the man with the drum, the twins with the flag, the lady who brings sweets for the substitutes.',
    });
    S('LON-09', {
      title: 'The last mile', when: 'season', trig: 'A season at a 1–2 star club or on loan, random', tone: 'funny',
      if: (c) => (c.loan || c.stars <= 2) && c.rnd(0.3),
      text: 'The team bus broke down a mile from the ground. You walked the last stretch in your kit, carrying the water bottles, past fans who joined in and carried the rest. You won 2–0.',
    });
    S('LON-10', {
      title: 'A manager to remember', when: 'season', trig: 'A season on loan with a good rating',
      if: (c) => c.loan && c.rating >= 7.0 && !c.has('loan_gaffer'),
      text: 'The loan club’s manager, {loanGaffer}, drove you home after a defeat and spent the journey drawing tactics on a napkin. “I won’t be at this level forever,” they said. You believed them.',
      sets: ['loan_gaffer'],
    });
    S('LON-11', {
      title: 'Stepping down to step up', when: 'season', trig: 'First season after moving to a smaller club',
      if: (c) => c.first && !c.loan && c.stepDown && c.rating >= 7.0,
      text: 'People called the move a step down. Thirty-odd games later, {journo} called it “the smartest bit of career planning this year”.',
      fx: { aff: { journo: 1 } },
    });
    S('LON-12', {
      title: 'Small-ground scarf', when: 'season', trig: 'Leaving a small club after a good spell', tone: 'warm',
      if: (c) => c.stars <= 2 && c.stint >= 2 && c.rating >= 7.2 && !c.loan && c.rnd(0.5),
      text: 'A volunteer at the club knitted you a scarf in the club colours with your number on each end. It’s the warmest thing you own.',
      sets: ['knitted_scarf'],
    });

    /* ---------- INJ · Injuries and setbacks (always hopeful) ---------- */
    S('INJ-01', {
      title: 'The physio’s playlist', when: 'season', trig: 'Your first injury spell',
      if: (c) => c.injured && !c.has('injured_before'),
      text: 'Your first proper injury. Months in the gym with the physio, who plays the same 12 songs on repeat. By the end you knew every word and could do single-leg squats to all of them.',
      sets: ['injured_before'],
    });
    S('INJ-02', {
      title: 'The stand view', when: 'season', trig: 'An injury spell', tone: 'warm',
      if: (c) => c.injured && c.rnd(0.6),
      text: 'Watching from the stand, you started to see the game differently: where the space opens, who drifts, when the press breaks. You filled two notebooks.',
      sets: ['studied_game'],
    });
    S('INJ-03', {
      title: 'Back with a bang', when: 'season', trig: 'A season after an injury, with goals or clean sheets', tone: 'proud',
      if: (c) => c.prevInjured && !c.injured && c.stat >= 3,
      text: 'Your first {firstStat} back came on your 40th day of full training. You didn’t celebrate. You ran to the physio on the bench and hugged them so hard they dropped the ice bag.',
    });
    S('INJ-04', {
      title: 'Cards from row F', when: 'season', trig: 'An injury spell after you met the superfan',
      needs: ['met_superfan'], if: (c) => c.injured && c.has('met_superfan') && !c.has('superfan_card'),
      text: 'A card arrived at the training ground in a child’s handwriting, then another every week. All signed by {superfan}. The last one said: “Row F is keeping your seat warm.”',
      sets: ['superfan_card'],
    });
    S('INJ-05', {
      title: 'The body talks back', when: 'season', trig: 'Age 31+, any season', tone: 'drama',
      if: (c) => c.age >= 31 && !c.has('body_talk'),
      text: 'You noticed the recovery took a day longer this season. The physio noticed you noticing.',
      choices: [
        { label: 'Overhaul your diet', desc: 'Goodbye, chips.', out: 'You haven’t had chips for a year. You think about them most days.', fx: { form: 0.03 } },
        { label: 'Start yoga', desc: 'With the whole back four.', out: 'Four centre-backs in a yoga studio. The instructor has never recovered. Your hamstrings have.', fx: { form: 0.03 }, sets: ['yoga'] },
        { label: 'Change nothing', desc: 'It’s worked for 14 years.', out: 'Fair. It has.' },
      ],
      sets: ['body_talk'],
    });
    S('INJ-06', {
      title: 'Same knee, new attitude', when: 'season', trig: 'A second injury spell', tone: 'drama',
      if: (c) => c.injured && c.has('injured_before') && !c.has('second_injury'),
      text: 'Another injury. This time you didn’t throw anything. You asked the physio for the plan, put it on the fridge and ticked off a box every night.',
      sets: ['second_injury'],
    });
    S('INJ-07', {
      title: 'The tournament you missed', when: 'season', trig: 'Injured in a tournament year and left out', tone: 'drama',
      if: (c) => c.injured && c.tour && !c.tour.calledUp,
      text: 'You watched the tournament from the sofa with your leg on a cushion and {sibling} commentating. You promised yourself one thing: the next one.',
      sets: ['next_tournament_promise'],
    });
    S('INJ-08', {
      title: 'A drawing on the fridge', when: 'season', trig: 'An injury spell, sibling at least 8', tone: 'warm',
      if: (c) => c.injured && c.age >= 16 && c.rnd(0.5),
      text: '{sibling} drew you scoring a goal with a bandage on, the ball on fire and the crowd as a row of smiley faces. It’s on your fridge next to the rehab plan.',
    });
    S('INJ-09', {
      title: 'Faith', when: 'season', trig: 'Injury spell during a long contract', tone: 'warm',
      if: (c) => c.injured && c.stint >= 2 && !c.loan,
      text: 'The club could have quietly looked for a replacement. Instead {gaffer} visited your house with a box of doughnuts and said, “We’ll be here when you’re back.”',
      fx: { aff: { gaffer: 1 } },
    });
    S('INJ-10', {
      title: 'The bet', when: 'season', trig: 'An injury spell, random', tone: 'funny',
      if: (c) => c.injured && c.rnd(0.4),
      text: 'The physio bet you a dinner you couldn’t be back before the derby. You were back a week early. They paid, then made you eat salad.',
    });
    S('INJ-11', {
      title: 'Message from the other side', when: 'season', trig: 'Injured while your rival had a good season',
      if: (c) => c.injured && c.rival && c.rivalBetter,
      text: 'Of all people, {rival} sent a message: “Hurry up. It’s boring winning without you.” You read it eleven times.',
      sets: ['rival_message'],
    });
    S('INJ-12', {
      title: 'The comeback chant', when: 'season', trig: 'First season back from injury, fans like you', tone: 'proud',
      if: (c) => c.prevInjured && !c.injured && c.mood >= 60 && !c.loan,
      text: 'When your number went up on the board for your comeback, the stadium stood up before you had crossed the line. You had to pretend there was something in your eye.',
      fx: { mood: 4 },
    });
