import $ from 'jquery';
import { parse } from 'csv-parse/lib/sync';
import 'datatables.net-bs';
import * as Utils from './Utils';

const resultFilename = "https://raw.githubusercontent.com/Jendersen/KG_accountability/towardsIndeGx/results/measures_26042023.csv";
const rawResultTableId = "#rawResults";


$(() => {

  Utils.xhrGetPromise(resultFilename).then((csvContent) => {
    console.log('csvContent: ', csvContent);
    const data = parse(csvContent, {
      delimiter: ',',
      skip_empty_lines: true
    }); 
    console.log('data: ', data);
    $(rawResultTableId).dataTable({
        data: data
    });
  })
})