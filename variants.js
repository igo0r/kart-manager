//[0,0,0,0,0,0,1];
function variantsArrIteration(i) {
    let ii = [...i];
    while (ii.length > 6) {
        let startIndex = 0;
        rows.forEach(row => {
            //let ii = [...i];
            let a = ii[6];
            ii.splice(6, 1);
            ii.splice(startIndex, 1);
            startIndex += row;
            ii.splice(startIndex - 1, 0, a);
            //test(ii)
            if (ii.length === 6) {
                count++;
                console.log(ii)
            }
        });

    }
}

    function variantsArr(i, result = {}) {
        if (i.length > rowsSum) {
            let startIndex = 0;
            rows.forEach(row => {
                let ii = [...i];
                let a = ii[ii.length - 1 - rowsSum];
                ii.splice(ii.length - 1 - rowsSum, 1);
                ii.splice(ii.length - 1 - startIndex, 1);
                startIndex += row;
                ii.splice(ii.length - startIndex + 1, 0, a);
                variantsArr(ii, result)
            })
        }
        if (i.length === rowsSum) {
            let startIndex = 0;
            console.log(i);
            rows.forEach(row => {
                let type = i[i.length - 1 - startIndex];
                result[type] = result[type] ? result[type] + 1 : 1;
                result.all = result.all ? result.all + 1 : 1;
                startIndex += row;
            })
        }

        for(let item in result) {
            console.log(result[item] / result.all);
        }
        return result;
    }

function variantsArrReverse(i) {
    if (i.length > rowsSum) {
        let startIndex = 0;
        rows.forEach(row => {
            let ii = [...i];
            let a = ii[rowsSum];
            ii.splice(rowsSum, 1);
            ii.splice(startIndex, 1);
            startIndex += row;
            ii.splice(startIndex - 1, 0, a);
            test(ii)
        })
    }
    if (i.length === rowsSum) {
        let startIndex = 0;
        rows.forEach(row => {
            i[startIndex]
        })
    }
}

function variantsStr(i) {
    if (i.length > 6) {
        let startIndex = 0;
        rows.forEach(row => {
            let ii = i;
            let a = ii[6];
            ii = ii.slice(0,6) + ii.slice(6+1);
            ii = ii.slice(0,startIndex) + ii.slice(startIndex+1);
            /*removeByIndex(ii, 6);
            removeByIndex(ii, startIndex);*/
            startIndex += row;
            ii = [ii.slice(0, startIndex - 1), a, ii.slice(startIndex - 1)].join('');
            test(ii)
        })
    }
    if (i.length === 6) {
        count++;
        console.log(i)
    }
}

function removeByIndex(str,index) {
    return str.slice(0,index) + str.slice(index+1);
}
