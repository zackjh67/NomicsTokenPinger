const fs = require('fs');
const _ = require('lodash');
const yargs = require('yargs/yargs');
const { hideBin } = require('yargs/helpers');
const argv = yargs(hideBin(process.argv)).argv;
const got = require('got');

// comma seperated list of currency Ids ex. BTC,ETH,XRP. without these, it queries all coins on nomics
const ids = argv.ids ? `${argv.ids}` : undefined;
// how long to wait until getting the data again IN SECONDS, rate limited to 1 second
// if this is set and above 1, then it takes that value. Otherwise, defaults to 1
const pingInterval = argv.pingInterval > 1 ? argv.pingInterval : 1;
// Comma separated time interval of the ticker(s).
//     Default is 1d,7d,30d,365d,ytd
const interval = argv.interval || '1d,7d,30d,365d,ytd';
// currency string to convert numbers to ex. 'USD'
const convert = argv.convert;
// filters tokens by status 'active', 'inactive' or 'dead'. Returns all tokens without a filter value
const status = argv.status
// Further filter the set of currencies.
    // The new filter returns currencies that have recently been priced by Nomics and any returns currencies regardless of their state.
    // The any filer may be used to retrieve new-but-stale currencies that are listed under new, but are no longer active.
    // values can be 'any' or 'new'
const filter = argv.filter;
// sorts results by 'rank' or 'first_priced_at'
const sort = argv['sort'];
// include transparent volume. Can be true or false. Default is false
const includeTransparency = argv.includeTransparency;
// how many results per page. Must be between 1-100
const perPage = argv.perPage;
// number of page to query at
const page = argv.page;
// if perPage and page are not set by the user, the system will query until the max number of pages are hit
// set this value to 'all' if you want to get all pages. who knows how long this will run though.
// THIS DEFAULTS TO 1
const maxNumPages = argv.maxNumPages || 1;
// user api key
const key = argv.key;
let currentPage = 0;
const apiUrl = `https://api.nomics.com/v1/currencies/ticker?`;

function ktimeout(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

const generateUrlParamsStr = (page) => {
    const urlParamsObj = {key, ids, interval, convert, status, filter, sort, 'include-transparency': includeTransparency, 'per-page': perPage, page};
    const urlParams = _.keys(urlParamsObj).map((k) => {
        if (urlParamsObj[k] === undefined) return undefined;
        return `${k}=${urlParamsObj[k]}`;
    }).filter(o=>o).join('&');
    return urlParams;
}


const callNomicsApi = async (page) => {
    const paramdUrl = `${apiUrl}${generateUrlParamsStr(page)}`;
    console.log('Here is the actual API call you are making....');
    console.log(paramdUrl);
    try {
        const response = await got(paramdUrl);
        console.log(response.body);
        console.log(' ');
        console.log('##NEWREQUEST##')
    } catch (error) {
        console.log(error);
    }
}

(async () => {
    if (argv.helpme) {
        console.log('Here are the arguments you may use: ');
        const argObj = {key, ids, interval, convert, status, filter, sort, includeTransparency, perPage, page, pingInterval, maxNumPages};
        console.log(_.keys(argObj).map((v) => {
            if (v == 'key') return 'key (REQUIRED, its your API key)';
            if (v == 'pingInterval') return 'pingInterval (internal argument to stagger concurrent calls to the API in SECONDS, default is 1 second)';
            if (v == 'maxNumPages') return 'maxNumPages (if you are using pagination but only want the first x num of pages. can also be set to "all" to get all pages but may result in weird stuff happening)';
            return v;
        }).join('\n'));
        console.log();
        console.log(`For more information go here to see what the args are all about: https://nomics.com/docs/#tag/Currencies`);
        return;
    }
    console.log('Starting program.....');

    if (ids) {
        console.log(`Getting values for coins: ${ids.split(',').join(', ')}`);
    } else {
        console.log('Getting values for ALL coins');
    }
    let maxPages = 1;
    while(currentPage < maxPages) {
        console.log('pinging......');
        await callNomicsApi(page || currentPage);

        currentPage++;
        if (maxNumPages === 'all') {
            maxPages++;
        }
        await ktimeout(pingInterval * 1000);
    }

    console.log('fuckin done');
})();
