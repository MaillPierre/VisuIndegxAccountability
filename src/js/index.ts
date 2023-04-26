import $ from 'jquery';
import { parse } from 'csv-parse/lib/sync';
import 'datatables.net-bs';
import * as Utils from './Utils';
import * as rules from '../computationStructure.json'

const resultFilename = "https://raw.githubusercontent.com/Jendersen/KG_accountability/towardsIndeGx/results/measures_26042023.csv";
const rawResultTableId = "#rawResults";
const evalResultTableId = "#evalResults";
const columns = [
  "Dataset",
  "Creation date",
  "Creation location",
  "Creation methodology",
  "Creation source",
  "Aggregated creator contributor",
  "Maintenance frequency",
  "Maintenance location",
  "Maintenance methodology",
  "Modification date",
  "Aggregated Maintenance contributor",
  "Aggregated Usage access",
  "Usage license",
  "Usage requirements",
  "Usage reuse",
  "Usage concepts covered",
  "Usage dataset description",
  "Usage dataset entities",
  "Usage dataset quality",
  "Usage RDF serialization",
  "Usage dataset triples",
  "Usage End availability",
  "Usage End validity",
  "Usage start availability",
  "Usage access address",
  "Usage location",
  "Usage dataset webpage",
  "Usage audience",
  "Usage Dataset publisher",
  "Usage rights"
];
const measures = [
  "Accountability",
  "Creation",
  "Maintenance",
  "Usage"
]

$(() => {

  // Load the rules
  console.log('rules: ', rules);

  Utils.xhrGetPromise(resultFilename).then((csvContent) => {
    console.log('csvContent: ', csvContent);
    const data = parse(csvContent, {
      delimiter: ',',
      skip_empty_lines: true,
      columns: true
    });

    const evalData = data.map(dataRow => {
      let dataset = dataRow.Dataset;
      let datasetEval = evalDataset(dataset);
      let result = { "Dataset": dataset };
      measures.forEach(measureName => {
        result[measureName] = datasetEval.get(measureName);
      })
      console.log(result)
      return result;
    });

    console.log('evalData: ', evalData)
    let evalDataTable = $(evalResultTableId).dataTable({
      data: evalData,
      columns: [{ "data": "Dataset" }].concat(measures.map(columnName => { return { "data": columnName } }))
    });

    let rawDataTable = $(rawResultTableId).dataTable({
      data: data,
      columns: columns.map(columnName => { return { "data": columnName } })
    });

    // let datasetEvals = new Map();
    // data.forEach((dataRow, index) => {
    //   const dataset = dataRow.Dataset;
    //   let datasetEval = evalDataset(dataset);
    //   datasetEvals.set(dataset, datasetEval);
    // });
    // console.log('datasetEvals: ', datasetEvals);
    // console.log('Eval Caligraph: ', datasetEvals.get("http://caligraph.org/.well-known/void").get("Accountability"));

    function evalDataset(dataset: string, feature: string = "Accountability"): Map<string, number> {
      let result = new Map<string, number>();
      if (rules[feature] !== undefined) {
        let featureScores: number[] = [];
        if (rules[feature].children !== undefined) {
          rules[feature].children.forEach((child: string) => {
            let childEval = evalDataset(dataset, child);
            childEval.forEach((value, key) => {
              result.set(key, value);
            });
            featureScores.push(childEval.get(child));
          });
        }
        if (rules[feature].keys !== undefined) {
          rules[feature].keys.forEach((key) => {
            data.filter(dataRow => dataRow.Dataset === dataset).forEach((dataRow) => {
              result.set(key, Number.parseFloat(dataRow[key]));
              featureScores.push(Number.parseFloat(dataRow[key]));
            });
          });
        }
        let featureScore = featureScores.reduce((a, b) => a + b, 0) / featureScores.length;
        result.set(feature, featureScore);
        return result;
      } else {
        throw new Error(`Feature ${feature} not found in rules`);
      }
    }
  })
})