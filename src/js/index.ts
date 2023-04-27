import $ from 'jquery';
import { parse } from 'csv-parse/lib/sync';
import 'datatables.net-bs';
import * as Utils from './Utils';
import * as rules from '../computationStructure.json'
import * as profiles from '../profiles.json'

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

  // Load the data
  Utils.xhrGetPromise(resultFilename).then((csvContent) => {
    const data = parse(csvContent, {
      delimiter: ',',
      skip_empty_lines: true,
      columns: true
    });
    let currentProfile = profiles[0];
    $("#standardProfileButton").on("click", () => {
      if(profiles.find(profile => profile.name === "Standard") !== undefined) {
        currentProfile = profiles.find(profile => profile.name === "Standard");
        refreshEvalData();
        refreshWeights();
      }
    });
    $("#trustProfileButton").on("click", () => {
      if(profiles.find(profile => profile.name === "Trust") !== undefined) {
        currentProfile = profiles.find(profile => profile.name === "Trust");
        refreshEvalData();
        refreshWeights();
      }
    });
    $("#mostCommonProfileButton").on("click", () => {
      if(profiles.find(profile => profile.name === "Frequency") !== undefined) {
        currentProfile = profiles.find(profile => profile.name === "Frequency");
        refreshEvalData();
        refreshWeights();
      }
    });

    // Generate the raw datatable
    let rawDataTable = $(rawResultTableId).DataTable({
      data: data,
      columns: columns.map(columnName => { return { "data": columnName } })
    });

    // Generate the evaluation table data
    function generateEvalData(data: any[]) {
      const evalData = data.map(dataRow => {
        let dataset = dataRow.Dataset;
        let datasetEval = evalDataset(dataset);
        let result = { "Dataset": dataset };
        measures.forEach(measureName => {
          result[measureName] = Utils.precise(datasetEval.get(measureName));
        })
        return result;
      });
      return evalData;
    };

    // Generate the evaluated datatable
    let evalDataTable = $(evalResultTableId).DataTable({
      data: generateEvalData(data),
      columns: [{ "data": "Dataset" }].concat(measures.map(columnName => { return { "data": columnName } }))
    });

    // Generate the evaluation of a feature from the data, the computation structure and the current profile
    function evalDataset(dataset: string, feature: string = "Accountability", profile = currentProfile): Map<string, number> {
      let result = new Map<string, number>();
      if (rules[feature] !== undefined) {
        let featureScores: number[] = [];
        let weights: number[] = [];
        // For each child, evaluate it and add it to the result
        // Childs are nodes that are not leafs from the computation structure
        if (rules[feature].children !== undefined) {
          rules[feature].children.forEach((child: string) => {
            let childEval = evalDataset(dataset, child, profile);
            childEval.forEach((value, key) => {
              result.set(key, value);
            });
            const rawChildScore = childEval.get(child);
            let childWeight = 1;
            if (profile[feature] !== undefined && profile[feature].children !== undefined && profile[feature].children.findLast(filterChild => filterChild.name === child) !== undefined && profile[feature].children.findLast(filterChild => filterChild.name === child).weight !== undefined) {
              childWeight = profile[feature].children.findLast(filterChild => filterChild.name === child).weight;
            }
            const childScore = rawChildScore * childWeight;
            result.set(child, childScore);
            weights.push(childWeight);
            featureScores.push(childScore);
          });
        }
        // For each key, evaluate it and add it to the result
        // Keys are leaf measure nodes from the data
        if (rules[feature].keys !== undefined) {
          rules[feature].keys.forEach((key) => {
            data.filter(dataRow => dataRow.Dataset === dataset).forEach((dataRow) => {
              const rawLeafValue = Number.parseFloat(dataRow[key]);
              let leafValue = rawLeafValue;
              let leafWeight = 1;
              if (profile[feature] !== undefined && profile[feature].keys !== undefined && profile[feature].keys.findLast(filterKey => filterKey.name === key) !== undefined && profile[feature].keys.findLast(filterKey => filterKey.name === key).weight !== undefined) {
                leafWeight = profile[feature].keys.findLast(filterKey => filterKey.name === key).weight;
              }
              leafValue = rawLeafValue * leafWeight;
              result.set(key, leafValue);
              weights.push(leafWeight);
              featureScores.push(leafValue);
            });
          });
        }
        // Compute the feature score
        let sumWeights = weights.reduce((a, b) => a + b, 0);
        let featureScore = featureScores.reduce((a, b) => a + b, 0) / sumWeights;
        result.set(feature, featureScore);
        return result;
      } else {
        throw new Error(`Feature ${feature} not found in rules`);
      }
    }

    function refreshEvalData() {
      evalDataTable.clear()
      evalDataTable.rows.add(generateEvalData(data))
      evalDataTable.draw()
    }

    function refreshWeights() {
      Object.keys(currentProfile).forEach(feature => {
        if (currentProfile[feature].children !== undefined) {
          currentProfile[feature].children.forEach(child => {
            const childKey = currentProfile[child.name].key;
            $(`#${childKey}`).val(child.weight);
          });
        }
      });
    }

    // Connecting the form to the evaluation display
    // init with current profile
    refreshWeights();
    Object.keys(currentProfile).forEach(feature => {
      if (currentProfile[feature].children !== undefined) {
        currentProfile[feature].children.forEach(child => {
          const childKey = currentProfile[child.name].key;
          // on change, update the profile and the evaluation
          $(`#${childKey}`).on('change', () => {
            child.weight = Number.parseFloat($(`#${childKey}`).val() as string);
            refreshEvalData()
          })
        });
      }
    });

  })
})