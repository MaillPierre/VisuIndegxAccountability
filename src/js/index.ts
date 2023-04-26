import $ from 'jquery';
import { parse } from 'csv-parse/lib/sync';
import 'datatables.net-bs';
import * as Utils from './Utils';
import * as rules from '../computationStructure.json'

const resultFilename = "https://raw.githubusercontent.com/Jendersen/KG_accountability/towardsIndeGx/results/measures_26042023.csv";
const rawResultTableId = "#rawResults";


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
    console.log('data: ', data);
    let table = $(rawResultTableId).dataTable({
      data: data,
      columns: [
        { "data": "Dataset" },
        { "data": "Creation date" },
        { "data": "Creation location" },
        { "data": "Creation methodology" },
        { "data": "Creation source" },
        { "data": "Aggregated creator contributor" },
        { "data": "Maintenance frequency" },
        { "data": "Maintenance location" },
        { "data": "Maintenance methodology" },
        { "data": "Modification date" },
        { "data": "Aggregated Maintenance contributor" },
        { "data": "Aggregated Usage access" },
        { "data": "Usage license" },
        { "data": "Usage requirements" },
        { "data": "Usage reuse" },
        { "data": "Usage concepts covered" },
        { "data": "Usage dataset description" },
        { "data": "Usage dataset entities" },
        { "data": "Usage dataset quality" },
        { "data": "Usage RDF serialization" },
        { "data": "Usage dataset triples" },
        { "data": "Usage End availability" },
        { "data": "Usage End validity" },
        { "data": "Usage start availability" },
        { "data": "Usage access address" },
        { "data": "Usage location" },
        { "data": "Usage dataset webpage" },
        { "data": "Usage audience" },
        { "data": "Usage Dataset publisher" },
        { "data": "Usage rights" }
      ]
    });

    let datasetEvals = new Map();
    data.forEach((dataRow, index) => {
      const dataset = dataRow.Dataset;
      let datasetEval = evalDataset(dataset);
      datasetEvals.set(dataset, datasetEval);
    });
    console.log('datasetEvals: ', datasetEvals);
    console.log('Eval Caligraph: ', datasetEvals.get("http://caligraph.org/.well-known/void").get("Accountability"));

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