export const pageCount = 25;

//https://gist.github.com/kottenator/9d936eb3e4e3c3e02598
export const pagination = (page, totalResults) => {
    const delta = 2,
        left = page - delta,
        right = page + delta + 1,
        range = [],
        rangeWithDots = []
    let l;

    for (let i = 1; i <= totalResults; i++) {
        if ((i === 1 || i === totalResults) || (i >= left && i < right)) {
            range.push(i);
        }
    }

    for (const i of range) {
        if (l) {
            if (i - l === 2) {
                rangeWithDots.push(l + 1);
            } else if (i - l !== 1) {
                rangeWithDots.push('...');
            }
        }
        rangeWithDots.push(i);
        l = i;
    }
    return rangeWithDots;
}
