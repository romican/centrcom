window.collectionsHelpers = {
  sortPeopleByName: (a, b) => a.full_name.localeCompare(b.full_name, 'ru'),
  sortPeopleByPlatoon: (a, b) => {
    const getOrder = (p) => {
      if (!p.platoon_name) return 0;
      const match = p.platoon_name.match(/\d+/);
      return match ? parseInt(match[0]) : 999;
    };
    return getOrder(a) - getOrder(b);
  },
  filterPeopleBySearch: (people, term) => {
    if (!term) return people;
    return people.filter(p => p.full_name.toLowerCase().includes(term));
  },
  sortSchoolsByName: (a, b) => a.edu_org.localeCompare(b.edu_org, 'ru'),
};