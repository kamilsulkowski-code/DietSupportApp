export function task3Fixture(scenario = 'normal') {
  const dates = scenario === 'short' ? ['2026-10-01', '2026-10-02'] : ['2026-09-30', '2026-10-01', '2026-10-02'];
  return {
    selectedIndex: scenario === 'short' ? 6 : scenario === 'negative' ? -1 : 0,
    plan: {
      id: 'isolated-test-plan', created_at: '2026-10-01T12:00:00Z',
      cycle_start: dates[0], cycle_end: dates.at(-1), target_kcal: 2200, target_protein_g: 140,
      content: { schema_version: 2, days: dates.map(date => ({ date,
        meals: [{ name: `TEST ${date}: kurczak z ryżem`, time: '12:00', kcal: 650, protein_g: 45,
          fat_g: 15, carbs_g: 75,
          ingredients: [
            {name:'Filet z piersi kurczaka', category:'Mięso i ryby', amount:220, unit:'g', biedronka:true},
            {name:'Ryż biały', category:'Produkty suche', amount:80, unit:'g', biedronka:true},
            {name:'Oliwa z oliwek', category:'Tłuszcze', amount:10, unit:'ml', biedronka:true},
          ], preparation: 'Ugotuj ryż i usmaż kurczaka na oliwie.' },
          { name:`TEST ${date}: jajka`, time:'19:00', kcal:300, protein_g:20, fat_g:15, carbs_g:5,
            ingredients:[{name:'Jaja', category:'Jaja i nabiał', amount:2, unit:'szt', biedronka:true}], preparation:'Ugotuj jajka.' }],
      })) },
    },
  };
}
