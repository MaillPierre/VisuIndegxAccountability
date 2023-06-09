import $ from 'jquery';
import { parse } from 'csv-parse/lib/sync';
import * as Utils from './Utils';
import * as rules from '../computationStructure.json'
import * as profiles from '../profiles.json'
import * as echarts from 'echarts';
import { Grid } from "gridjs";
import "gridjs/dist/theme/mermaid.css";

const resultFilename = "https://raw.githubusercontent.com/Jendersen/KG_accountability/towardsIndeGx/results/Measures-24-04-2023.csv";
const commentFilename = "https://raw.githubusercontent.com/Jendersen/KG_accountability/towardsIndeGx/information_need/metric_question_remarks.csv";
const rawResultTableId = "#rawResults";
const evalResultTableId = "#evalResults";
const measures = [
  "Accountability",
  "Creation",
  "Maintenance",
  "Usage"
]

$(() => {

  // Load the data
  Utils.xhrGetPromise(resultFilename).then((csvContent) => {
    const data: any[] = parse(csvContent, {
      delimiter: ',',
      skip_empty_lines: true,
      columns: true
    });
    Utils.xhrGetPromise(commentFilename).then((csvCommentContent) => {
      const commentData: any[] = parse(csvCommentContent, {
        delimiter: ';',
        skip_empty_lines: true,
        columns: true
      });

      // Generate the data table options from a parsed CSV
      function dataToGridJSConfig(evalData) {
        const result = {
          columns: evalData[0] !== undefined ? Object.keys(evalData[0]).map(columnName => { return { id: columnName, name: columnName } }) : [],
          data: evalData,
          search: true,
          sort: true,
          pagination: true
        }
        return result;
      }

      // Generates the profuile buttons, TODO: replace with menu generated from profiles.json
      let currentProfile = profiles[0];
      $("#standardProfileButton").on("click", () => {
        if (profiles.find(profile => profile.name === "Standard") !== undefined) {
          currentProfile = profiles.find(profile => profile.name === "Standard");
          refreshEvalData();
          refreshWeights();
        }
      });
      $("#trustProfileButton").on("click", () => {
        if (profiles.find(profile => profile.name === "Trust") !== undefined) {
          currentProfile = profiles.find(profile => profile.name === "Trust");
          refreshEvalData();
          refreshWeights();
        }
      });
      $("#mostCommonProfileButton").on("click", () => {
        if (profiles.find(profile => profile.name === "Frequency") !== undefined) {
          currentProfile = profiles.find(profile => profile.name === "Frequency");
          refreshEvalData();
          refreshWeights();
        }
      });

      // Generate the raw datatable
      $("#rawResultsWrapper").empty();
      let rawDataTable = new Grid(dataToGridJSConfig(data)).render(document.getElementById("rawResultsWrapper"));

      function findComment(measureName: string): string {
        let resultFind = commentData.filter((commentRow) => commentRow.Measure === measureName)[0];
        let result = resultFind !== undefined ? resultFind.Advice : measureName;
        return result;
      }

      // Generate the evaluation table data
      function generateEvalData(data: any[]) {
        const evalData = data.map(dataRow => {
          let dataset = dataRow.Dataset;
          let endpoint = dataRow.Endpoint;
          let datasetEval = evalDataset(dataset);
          let result = { "Endpoint": endpoint, "Dataset": dataset };
          measures.forEach(measureName => {
            result[measureName] = Utils.precise(datasetEval.get(measureName));
          })
          return result;
        });
        return evalData;
      };

      // Generate the evaluation table
      $("#evalResultsWrapper").empty();
      let evalDataTable = new Grid(dataToGridJSConfig(generateEvalData(data))).render(document.getElementById("evalResultsWrapper"));

      // Generate the evaluation visualization
      let chartDom = document.getElementById('evalVisu');
      chartDom.style.height = "800px";
      chartDom.style.width = $("#mainContentCol").width() + "px";
      let myChart = echarts.init(chartDom);
      let option = generateParallelLinesOptions();
      myChart.setOption(option);
      // Generating the chart series
      function generateParallelLinesOptions() {
        let evalData = generateEvalData(data);
        let endpointList = [...new Set(evalData.map(dataRow => dataRow.Endpoint))];
        let chartSeries = endpointList.map(endpoint => {
          return {
            name: endpoint,
            type: 'parallel',
            lineStyle: {
              width: 4
            },
            tooltip: {
              show: true
            },
            data: evalData.filter(dataRow => dataRow.Endpoint === endpoint).map(dataRow => {
              return [dataRow.Creation, dataRow.Maintenance, dataRow.Usage, dataRow.Dataset]
            })
          }
        });
        return {
          title: {
            top: 'top',
            left: 'center',
            show: true,
            text: 'Evaluation of the accountability of the datasets',
          },
          parallelAxis: [
            {
              dim: 0,
              name: 'Creation',
              max: 1
            },
            {
              dim: 1,
              name: 'Maintenance',
              max: 1
            },
            {
              dim: 2,
              name: 'Usage',
              max: 1
            },
          ],
          tooltip: {
            showDelay: 0,
            formatter: function (params) {
              return `${params.seriesName} <br/> ${params.value[3]} <br/> Creation: ${params.value[0]} <br/> Maintenance: ${params.value[1]} <br/> Usage: ${params.value[2]}`;
            },
          },
          series: chartSeries
        };
      }

      // Generate the evaluation of a feature from the data, the computation structure and the current profile
      // Returns a map of the feature and its children associated with their score
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
              // We add the other scores to the result, they are the results of other sub-child computations
              childEval.forEach((value, key) => {
                result.set(key, value);
              });
              // We get the result of the child computation
              const rawChildScore = childEval.get(child);
              // We get the weight of the child in the profile
              let childWeight = 1;
              if (profile[feature] !== undefined && profile[feature].children !== undefined && profile[feature].children.findLast(filterChild => filterChild.name === child) !== undefined && profile[feature].children.findLast(filterChild => filterChild.name === child).weight !== undefined) {
                childWeight = profile[feature].children.findLast(filterChild => filterChild.name === child).weight;
              }
              // We multiply the result by its weight for the computation of the feature score
              const childScore = rawChildScore * childWeight;
              // We add the weight and the score to the arrays for the computation of the feature score
              weights.push(childWeight);
              featureScores.push(childScore);
            });
          }
          // For each key, evaluate it and add it to the result
          // Keys are leaf measure nodes from the data
          if (rules[feature].keys !== undefined) {
            rules[feature].keys.forEach((key) => {
              data.filter(dataRow => dataRow.Dataset === dataset).forEach((dataRow) => {
                // We get the value of the leaf measure in the data
                const rawLeafValue = Number.parseFloat(dataRow[key]);
                let leafValue = rawLeafValue;
                // We get the weight of the leaf measure in the profile
                let leafWeight = 1;
                if (profile[feature] !== undefined && profile[feature].keys !== undefined && profile[feature].keys.findLast(filterKey => filterKey.name === key) !== undefined && profile[feature].keys.findLast(filterKey => filterKey.name === key).weight !== undefined) {
                  leafWeight = profile[feature].keys.findLast(filterKey => filterKey.name === key).weight;
                }
                // We multiply the value by its weight for the computation of the feature score
                leafValue = rawLeafValue * leafWeight;
                // We add the weight and the value to the arrays for the computation of the feature score
                weights.push(leafWeight);
                featureScores.push(leafValue);
              });
            });
          }
          // Compute the feature score
          // We sum the weights and the scores and divide the sum of the scores by the sum of the weights
          let sumWeights = weights.reduce((a, b) => a + b, 0);
          let featureScore = featureScores.reduce((a, b) => a + b, 0) / sumWeights;
          // We add the feature and its score to the result
          result.set(feature, featureScore);
          return result;
        } else {
          throw new Error(`Feature ${feature} not found in rules`);
        }
      }

      function refreshEvalData() {
        try {
          evalDataTable.updateConfig({
            data: generateEvalData(data).map(dataRow => dataRow !== undefined ? Object.keys(dataRow).map(key => dataRow[key]) : []),
          }).forceRender();
        } catch (e) {
          console.error(e);
        }
        myChart.setOption(generateParallelLinesOptions(), true);
      }
      refreshEvalData();

      function refreshWeights() {
        Object.keys(currentProfile).forEach(feature => {
          if (currentProfile[feature].children !== undefined) {
            currentProfile[feature].children.forEach(child => {
              const childKey = currentProfile[child.name].key;
              $(`#${childKey}`).val(child.weight);
            });
          }
          if (currentProfile[feature].keys !== undefined) {
            currentProfile[feature].keys.forEach(child => {
              if (rules[child.name] !== undefined) {
                const childKey = rules[child.name].weightKey;
                $(`#${childKey}`).val(child.weight);
              } else {
                console.error(`No weight ${child.name} found in profile`)
              }
            });
          }
        });
      }

      // Generate the weight form tree view
      let creationList = $("<ul></ul>");
      creationList.append(generateFeatureWeightListView("Creation"));
      $("#creationListRow").append(creationList);
      let maintenanceList = $("<ul></ul>");
      maintenanceList.append(generateFeatureWeightListView("Maintenance"));
      $("#maintenanceListRow").append(maintenanceList);
      let usageList = $("<ul></ul>");
      usageList.append(generateFeatureWeightListView("Usage"));
      $("#usageListRow").append(usageList);
      function generateFeatureWeightListView(feature: string): JQuery<HTMLElement> {
        if (feature !== undefined && rules[feature] !== undefined) {
          const featureId = rules[feature].weightKey;
          const featureName = rules[feature].name;
          const featureComment = findComment(feature);
          let result = $("<li />");
          result.attr("title", featureComment);
          if (featureId === undefined) {
            result.append(`<span class="tf-nc">${featureName} </span>`)
          } else {
            result.append(`<span class="tf-nc"><label for="${featureId}"> ${featureName} </label> <input id="${featureId}" type="text" name="${featureId}" /></span>`)
          }
          if (rules[feature].keys !== undefined || rules[feature].children !== undefined) {
            let chidrenList = $(`<ul></ul>`);
            if (rules[feature].children !== undefined) {
              rules[feature].children.forEach(child => {
                chidrenList.append(generateFeatureWeightListView(child))
              });
            }
            if (rules[feature].keys !== undefined) {
              rules[feature].keys.forEach(child => {
                chidrenList.append(generateFeatureWeightListView(child))
              });
            }
            result.append(chidrenList);
          }
          return result;
        } else {
          console.error(rules)
          throw new Error(`Feature ${feature} not found in rules`);
        }
      }


      // Connecting the form to the evaluation display
      // init with current profile
      refreshWeights();
      Object.keys(currentProfile).forEach(feature => {
        if (currentProfile[feature].children !== undefined) {
          currentProfile[feature].children.forEach(child => {
            const childKey = rules[child.name].weightKey;
            // on change, update the profile and the evaluation
            $(`#${childKey}`).on('change', () => {
              child.weight = Number.parseFloat($(`#${childKey}`).val() as string);
              refreshEvalData()
            })
          });
        }
        if (currentProfile[feature].keys !== undefined) {
          currentProfile[feature].keys.forEach(child => {
            const childKey = rules[child.name].weightKey;
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
})