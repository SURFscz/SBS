const monthsBetween = (minDate, maxDate) =>
    (maxDate.getMonth() - minDate.getMonth()) + ((maxDate.getYear() - minDate.getYear()) * 12)

export const addMissingDateEntries = res => {
    //Find the min date, max date and fill in the blanks in between and then accumulate the counts
    const allDates = Object.values(res).flat().map(item => new Date(item.year, item.month - 1, 1));
    const minDate = new Date(Math.min.apply(null, allDates));
    const maxDate = new Date(Math.max.apply(null, allDates));
    const nbrMonths = Math.max(1, monthsBetween(minDate, maxDate) + 1);
    const allEntries = Array(nbrMonths).fill(0)
        .reduce((acc, _, index) => { // eslint-disable-line no-unused-vars
            const newDate = new Date(minDate);
            newDate.setMonth(minDate.getMonth() + index)
            acc[`${newDate.getMonth() + 1}-${newDate.getFullYear()}`] = {
                count: 0,
                month: newDate.getMonth() + 1,
                year: newDate.getFullYear()
            }
            return acc;
        }, {})
    const entriesGrouped = Object.entries(res).reduce((acc, entry) => {
        acc[entry[0]] = entry[1].reduce((innerAcc, item) => {
            innerAcc[`${item.month}-${item.year}`] = item;
            return innerAcc;
        }, {})
        return acc;
    }, {});
    return Object.entries(entriesGrouped).reduce((acc, entry) => {
        //Use the spread to override the unwanted 0 counts
        const values = Object.values({...allEntries, ...entry[1]});
        //Add the count values subsequently
        acc[entry[0]] = values.reduce((innerAcc, item, index) => {
            const newItem = {...item};
            newItem.count = index === 0 ? item.count : (item.count + innerAcc[index - 1].count);
            innerAcc.push(newItem);
            return innerAcc;
        }, []);
        return acc;
    }, {});
}

/**
 * Recharts expects the following format:
 const data = [ {
    name: 'Label X1',
    line1: 4000,
    line2: 2400
  },
  {
    name: 'Label X2',
    line1: 3000,
    line2: 1398
  },
 * @param stats the outcome of addMissingDateEntries. See __tests__/data/statsOutput.json
 */
export const transformToRechartsData = stats => {
    return Object.keys(stats).reduce((acc, key) =>{
        const entries = stats[key];
        entries.forEach(entry => {
            const name = `${entry.month}-${entry.year}`;
            const dataItem = acc.find(item => item.name === name);
            if (dataItem) {
                dataItem[key] = entry.count;
            } else {
                const newItem = {name: name};
                newItem[key] = entry.count;
                acc.push(newItem);
            }
        });
        return acc;
    },[])
}
