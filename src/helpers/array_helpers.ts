

export function sumItemValues<T>(items: T[], property: keyof T){
    let sum = 0;
    items.forEach((item) => {
        let val = item[property];
        if(typeof val === "number"){
            sum += val;
        }
    })
    return sum;
}