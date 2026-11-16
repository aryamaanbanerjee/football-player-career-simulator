    /* ---------- CB · Callbacks and payoffs ---------- */
    /* Every story here needs a flag planted by an earlier story. They are the moments
       that make a player think the game was "remembering" all along. */
    S('CB-01', {
      title: 'The shirt swap', when: 'season', trig: 'You promised your best mate a shirt swap; you finally play his club (or turn 26)', tone: 'warm', w: 2,
      needs: ['promised_mate_shirt'], if: (c) => c.has('promised_mate_shirt') && !c.has('mate_shirt_swapped') && !c.has('cb_shirt') && (c.mateMeet || c.age >= 26),
      text: 'You finally played against {mate}. After the whistle he walked straight over, already pulling his shirt off. “Told you I’d hold you to it.” Both shirts are framed now, in two different houses, facing the same way.',
      sets: ['cb_shirt', 'mate_shirt_swapped'], fx: { aff: { mate: 1 } },
    });
    S('CB-02', {
      title: 'Another mint', when: 'season', trig: 'The kit man gave you a mint on debut; now a youngster is nervous', tone: 'warm', w: 2,
      needs: ['kitman_mint', 'protege_met'], if: (c) => c.has('kitman_mint') && c.has('protege_met') && !c.has('cb_mint'),
      text: 'Before {protege}’s first start you noticed the same grey face you once had in the mirror. You found a mint in your bag. You don’t remember putting it there. You suspect you’ve carried one every week since your debut.',
      sets: ['cb_mint'],
    });
    S('CB-03', {
      title: 'No pies', when: 'season', trig: 'Your parent missed your first goal in a pie queue; a final this season', tone: 'funny', w: 2,
      needs: ['pie_queue'], if: (c) => c.has('pie_queue') && c.major && !c.has('cb_pie'),
      text: 'For the final, {parent} took sandwiches from home, sat down 90 minutes early and refused to stand up until the whistle. “I’m not missing another one for a pie.” They didn’t.',
      sets: ['cb_pie'],
    });
    S('CB-04', {
      title: 'Goals still in them', when: 'season', trig: 'Your old captain gave you his boots; you are now captain', tone: 'proud', w: 2,
      needs: ['captain_boots'], if: (c) => c.has('captain_boots') && c.captain && !c.has('cb_boots'),
      text: 'The day you were made captain, you found the old boots {captain} gave you at the back of the wardrobe. They still had a bit of academy mud in the studs. You gave them to the youngest player in your squad with the same line.',
      sets: ['cb_boots'],
    });
    S('CB-05', {
      title: 'The mug, again', when: 'window', trig: 'Your parent printed the closed-eyes photo on a mug; any later transfer', tone: 'funny',
      needs: ['mug_photo'], if: (c) => c.has('mug_photo') && c.kind === 'TRANSFER' && !c.has('cb_mug'),
      text: 'At the {club} photo shoot you kept your eyes open so hard you looked startled. {parent} chose that one for the new mug. The mugs now sit side by side: asleep, then terrified.',
      sets: ['cb_mug'],
    });
    S('CB-06', {
      title: 'Row F grows up', when: 'season', trig: 'You met the kid in Row F; eight or more seasons later', tone: 'warm', w: 2.5,
      needs: ['met_superfan'], if: (c) => c.has('met_superfan') && c.total >= 8 && !c.has('cb_superfan'),
      text: 'A young physio introduced themselves on their first day: {superfan}. “Row F,” they said, and showed you a faded cardboard sign on their phone. “I said future legend. I was right, wasn’t I?”',
      sets: ['cb_superfan'],
    });
    S('CB-07', {
      title: 'The nickname spreads', when: 'season', trig: 'The treadmill nickname stuck; a big season later', tone: 'funny',
      needs: ['nickname'], if: (c) => c.has('nickname') && c.rating >= 7.4 && !c.has('cb_nickname'),
      text: 'The fans now chant “Turbo”. Nobody outside the club knows it’s because you were fired off the back of a treadmill. {kitman} has promised to keep it that way. For a price.',
      sets: ['cb_nickname'],
    });
    S('CB-08', {
      title: 'Earned it', when: 'season', trig: 'Your coach told you not to change boots for a sponsor until you’d earned it; you win a big trophy', tone: 'proud',
      needs: ['coach_boots_advice'], if: (c) => c.has('coach_boots_advice') && c.major && !c.has('cb_sponsor'),
      text: 'A boot company offered you your own design. You said yes, on one condition: the inside of the tongue says “Earned it.” You sent the first pair to {coach}, who wears them to do the gardening.',
      sets: ['cb_sponsor'], fx: { aff: { coach: 1 } },
    });
    S('CB-09', {
      title: 'The academy wall', when: 'season', trig: 'You practised your weak foot against the academy wall; you win the Ballon d’Or or a league', tone: 'warm',
      needs: ['weak_foot'], if: (c) => c.has('weak_foot') && (c.ballon || c.won('DOMESTIC_LEAGUE')) && !c.has('cb_wall'),
      text: '{academyClub} painted a small circle on the academy wall around the old ball mark, with a plaque underneath. The kids still kick against it. They say it’s lucky. They are not wrong.',
      sets: ['cb_wall'],
    });
    S('CB-10', {
      title: 'The {club} machine', when: 'season', trig: 'You bought your parent a washing machine with your first pay; five or more seasons later', tone: 'funny',
      needs: ['washing_machine'], if: (c) => c.has('washing_machine') && c.total >= 6 && !c.has('cb_washer'),
      text: 'The washing machine finally broke. {parent} refused to throw it away. It is now a plant pot in the garden, and visitors are still shown it before the kitchen.',
      sets: ['cb_washer'],
    });
    S('CB-11', {
      title: 'The fridge door', when: 'season', trig: 'You lodged with the loan landlady; you become an international', tone: 'warm', w: 2,
      needs: ['loan_landlady'], if: (c) => c.has('loan_landlady') && c.caps >= 1 && !c.has('cb_fridge'),
      text: 'A text from the couple you lodged with on loan: a photo of their fridge door, with your national-team photo in the middle. The magnet holding it up is shaped like a small sausage roll.',
      sets: ['cb_fridge'],
    });
    S('CB-12', {
      title: 'Still keeping your seat', when: 'season', trig: 'The superfan sent cards during your injury; a big season after it', tone: 'warm',
      needs: ['superfan_card'], if: (c) => c.has('superfan_card') && !c.injured && c.rating >= 7.2 && !c.has('cb_card'),
      text: 'You kept all of {superfan}’s cards in a shoebox. After your best game of the season you wrote one back, in your worst handwriting, and left it on a seat in Row F.',
      sets: ['cb_card'],
    });
    S('CB-13', {
      title: 'The cushion', when: 'season', trig: 'You promised yourself the next tournament while injured; you win it', tone: 'proud', w: 3,
      needs: ['next_tournament_promise'], if: (c) => c.has('next_tournament_promise') && c.tour && c.tour.won && !c.has('cb_cushion'),
      text: 'You won the tournament you watched from a sofa four years ago. {sibling} brought the cushion to the homecoming parade and held it above their head like a second trophy.',
      sets: ['cb_cushion'],
    });
    S('CB-14', {
      title: 'Lucky bag', when: 'season', trig: 'Your tournament room-mate gave you his bag; you are called up again', tone: 'funny',
      needs: ['tour_room'], if: (c) => c.has('tour_room') && c.tour && c.tour.calledUp && !c.has('cb_bag'),
      text: 'You packed the old tournament bag again. The zip is broken and it still smells faintly of your room-mate’s deodorant. You would not use any other.',
      sets: ['cb_bag'],
    });
    S('CB-15', {
      title: 'Same week', when: 'retire', trig: 'You and your rival respected each other; at retirement', tone: 'warm', w: 2,
      needs: ['rival_respect'], if: (c) => c.has('rival_respect'),
      text: '{rival} announced his retirement the same week as you. He sent a video: just him in his kitchen, raising a cup of tea. “Same week. Even now you won’t let me have one to myself.”',
      fx: { aff: { rival: 1 } },
    });
    S('CB-16', {
      title: 'Same locker', when: 'season', trig: 'Your sibling joined your academy; three or more seasons later', tone: 'proud', w: 2,
      needs: ['sibling_academy'], if: (c) => c.has('sibling_academy') && c.siblingAge >= 19 && !c.has('cb_sibling_debut'),
      text: '{sibling} made their senior debut. You watched from the stand, in the seat {parent} used to sit in, and you finally understood why {parent} never sat still.',
      sets: ['cb_sibling_debut'],
    });
    S('CB-17', {
      title: 'Coach the dog', when: 'season', trig: 'You named your dog after your coach; the coach visits', tone: 'funny',
      needs: ['dog'], if: (c) => c.has('dog') && c.rnd(0.5) && !c.has('cb_dog'),
      text: '{coach} came to stay for a weekend. Every time you called the dog, both of them turned round. By Sunday they had agreed to share the name and the sofa.',
      sets: ['cb_dog'],
    });
    S('CB-18', {
      title: 'Back at the old club', when: 'season', trig: 'You stayed after a relegation; you later win a major trophy elsewhere', tone: 'warm',
      needs: ['stayed_after_relegation'], if: (c) => c.has('stayed_after_relegation') && c.major && c.stint <= 2 && !c.has('cb_relegation'),
      text: 'A box arrived from your old club: a signed shirt from the whole squad, and a note from the canteen staff. “We never forgot who stayed.”',
      sets: ['cb_relegation'],
    });
    S('CB-19', {
      title: 'The protege’s shirt', when: 'retire', trig: 'Your protege scored from your pass; at retirement', tone: 'proud', w: 3,
      needs: ['protege_goal'], if: (c) => c.has('protege_goal'),
      text: 'At your last game, {protege} warmed up in a shirt with your number on the back, and his own name. He scored in the second half and ran to the bench this time. You pushed him towards the fans, again.',
    });
    S('CB-20', {
      title: 'Session plan', when: 'retire', trig: 'You took your coaching badges; at retirement', tone: 'warm', w: 2,
      needs: ['badges'], if: (c) => c.has('badges'),
      text: 'Your first session as a coach. On the clipboard: {coach}’s old plan, your notes in the margin, and one new line at the bottom in capitals: BENCHES ARE FOR SITTING.',
    });
    S('CB-21', {
      title: 'Mural, restored', when: 'season', trig: 'Your mural near the old ground was vandalised and fixed; you return as a hero', tone: 'funny',
      needs: ['mural_moustache'], if: (c) => c.has('mural_moustache') && c.atBoyhood && !c.has('cb_mural'),
      text: 'The mural near your old ground was repainted properly. The artist added a tiny moustache in the corner, “for history”. You asked them to leave it.',
      sets: ['cb_mural'],
    });
    S('CB-22', {
      title: 'Two season tickets', when: 'retire', trig: 'Your agent wrote your parent’s season tickets into every contract; at retirement', tone: 'warm', w: 2,
      needs: ['parent_tickets'], if: (c) => c.has('parent_tickets'),
      text: '{agent} counted: {parent} used season tickets at {clubs} clubs and missed eleven games in your whole career. They asked if the clause could carry on for {sibling}.',
    });
