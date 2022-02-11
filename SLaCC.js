// ------------------------
// Supervised Land Cover Classification (SLaCC)
// ------------------------

// An example of the tool can be found here: https://code.earthengine.google.com/e29b1343a86f2f957568ebb70a030bf6 
// This tool was develop by the NASA DEVELOP Summer 2019 Southern Maine Health and Air Quality Team. 
// Part 1 of this script allows users to create a supervised land cover map over a region using a 
// Classification And Regression Tree (CART) model. Currently the script is set for Cumberland County, Maine. 
// Part 2 of this script allows users to create a map that displays the "edges" of chosen land covers. 

// Required Packages
// ===================
// * Google Earth Engine API
// * Required Data Inputs: Landsat 8 OLI, National Land Cover Database (NLCD), Region of Interest (roi) geometry, CCmaine shapefile
// * Training data: agriculture, water, coniferous, mixed, and deciduous training points included in the "SLaCC_trainingdata" folder

// Parameters
// -------------
// To access the land cover data:
// Click “Run” in the top right corner of the main command window to launch the user interface panel. 
// To export the data displayed on the map, click the orange "Tasks" tab and click the "run" button next to the desired layer. 
// This will export the map as a GeoTiff file to your Google Drive. This will take a few minutes to complete. 
// See SLaCC README script for more information.

// To access the edge map data:
// Uncomment the edge map location script, and uncomment one map only (i.e., 'Edge Classification', ' Edges using Mid/High Urban vs Forest Cover', and ' Edges using Low Urban vs Forest Cover')
// Click "Run: in the top right corner of the main command window to launch the user interface panel. Then uncheck the 'Geometry Imports' tab at the top left of the map.
// To export the data displayed on the map:
// Choose which final layer you would like exported, enter it under the title of the "Export" section.
// Click the orange "Tasks" tab and click "run" next to the desired layer.
// This will export the map as a GeoTiff file to your Google Drive. This will take a few minutes to complete.


// Contact
// ---------
// Name: Britnay Beaudry, Celeste Gambino, Monica Colmenares
// E-mail(s): britnaybeaudry@gmail.com, cmgambino16@gmail.com, monica.colmenares34@gmail.com


//// *****Start of code*****

////***Filter to Cumberland County, ME***

// Insert Landsat Image Collection and filter for selected date(s) and area using an imported shapefile
var image = ee.ImageCollection("LANDSAT/LC08/C01/T1_SR")
  .filterDate('2018-07-12', '2018-07-30')
  .filterBounds(CCmaine);

// Create a function to cloud mask from the pixel_qa band of Landsat 8 SR data. Bits 3 and 5 are cloud shadow and cloud, respectively.
function maskL8sr(image) {
  var cloudShadowBitMask = 1 << 3;
  var cloudsBitMask = 1 << 5;

  var qa = image.select('pixel_qa');

  var mask = qa.bitwiseAnd(cloudShadowBitMask).eq(0)
      .and(qa.bitwiseAnd(cloudsBitMask).eq(0));

  return image.updateMask(mask).divide(10000)
      .select("B[0-9]*")
      .copyProperties(image, ["system:time_start"]);
}

// Make a Composite: Apply the cloud mask function, use the median reducer, 
// and clip the composite to our area of interest
var composite = image
              .map(maskL8sr)
              .median()
              .clip(CCmaine);

// Display the composite
Map.addLayer(composite, {bands: ['B4','B3','B2'], min: 0, max: 0.3},'Cumberland Color Image', 0);

// Add the impervious surface layer
var impervious = ee.ImageCollection('USGS/NLCD')
                .filterDate('2016-01-01', '2017-01-01')
                .filterBounds(CCmaine)
                .select('impervious')
                .map(function(image){return image.clip(CCmaine)});

// Reduce the impervious surface image collection 
var reduced = impervious.reduce('median');

// Mask out the zero values in the data
var masked = reduced.selfMask();

//***SUPERVISED CLASSIFICATION OF CUMBERLAND***
// In this example, we use landcover classes: 
// 1-100 = Percent Impervious Surfaces
// 101 = coniferous  
// 102 = mixed
// 103 = deciduous
// 104 = agriculture
// 105 = water

// Merge landcover classifications into one feature class
var newfc = coniferous.merge(mixed).merge(deciduous).merge(agriculture).merge(water);

// Specify the bands to use in the prediction.
var bands = ['B3', 'B4', 'B5', 'B6', 'B7'];

// Make training data by 'overlaying' the points on the image.
var points = composite.select(bands).sampleRegions({
  collection: newfc, 
  properties: ['landcover'], 
  scale: 30
}).randomColumn();

// Randomly split the samples to set some aside for testing the model's accuracy
// using the "random" column. Roughly 80% for training, 20% for testing.
var split = 0.8;
var training = points.filter(ee.Filter.lt('random', split));
var testing = points.filter(ee.Filter.gte('random', split));

//Print these variables to see how much training and testing data you are using
print('Samples n =', points.aggregate_count('.all'));
print('Training n =', training.aggregate_count('.all'));
print('Testing n =', testing.aggregate_count('.all'));

// Get a CART classifier and train it.
var classifier = ee.Classifier.smileCart(300,5).train({
  features: points, 
  classProperty: 'landcover', 
  inputProperties: bands
});

//*****Test the accuracy of the model*****

// Print Confusion Matrix and Overall Accuracy
var confusionMatrix = classifier.confusionMatrix();
print('Confusion matrix: ', confusionMatrix);
print('Training Overall Accuracy: ', confusionMatrix.accuracy());
var kappa = confusionMatrix.kappa();
print('Training Kappa', kappa);
 
var validation = testing.classify(classifier);
var testAccuracy = validation.errorMatrix('landcover', 'classification');
print('Validation Error Matrix RF: ', testAccuracy);
print('Validation Overall Accuracy RF: ', testAccuracy.accuracy());
var kappa1 = testAccuracy.kappa();
print('Validation Kappa', kappa1);

// Apply the trained classifier to the image
var classified = composite.select(bands).classify(classifier);

//***ADD A LEGEND***

// Set position of panel
var legend = ui.Panel({
  style: {
    position: 'bottom-left',
    padding: '8px 15px'
  }
});
 
// Create legend title
var legendTitle = ui.Label({
  value: 'Classification Legend',
  style: {
    fontWeight: 'bold',
    fontSize: '18px',
    margin: '0 0 4px 0',
    padding: '0'
    }
});
 
// Add the title to the panel
legend.add(legendTitle);
 
// Creates and styles 1 row of the legend.
var makeRow = function(color, name) {
 
      // Create the label that is actually the colored box.
      var colorBox = ui.Label({
        style: {
          backgroundColor: '#' + color,
          // Use padding to give the box height and width.
          padding: '8px',
          margin: '0 0 4px 0'
        }
      });
 
      // Create the label filled with the description text.
      var description = ui.Label({
        value: name,
        style: {margin: '0 0 4px 6px'}
      });
 
      // return the panel
      return ui.Panel({
        widgets: [colorBox, description],
        layout: ui.Panel.Layout.Flow('horizontal')
      });
};
 
//  Palette with the colors
var palette =['CCADE0', 'A052D3', '633581', '18620f', '3B953B','89CD89', 'EFE028', '0b4a8b'];
 
// Names in the legend
var names = ['Low Density Development','Mid Density Development','High Density Development','Coniferous','Mixed','Deciduous','Agriculture','Water'];
 
// Add color and names
for (var i = 0; i < 8; i++) {
  legend.add(makeRow(palette[i], names[i]));
  }  
 
// Add legend to map
Map.add(legend);

// Create palette for the final landcover map classifications
var urbanPalette = 
'<RasterSymbolizer>' +
 ' <ColorMap  type="intervals">' +
    '<ColorMapEntry color="#CCADE0" quantity="22" label="Low Density Development"/>' +
    '<ColorMapEntry color="#A052D3" quantity="56" label="Mid Density Development"/>' +
    '<ColorMapEntry color="#633581" quantity="100" label="High Density Development"/>' +
    '<ColorMapEntry color="#18620f" quantity="101" label="Coniferous"/>' +
    '<ColorMapEntry color="#3B953B" quantity="102" label="Mixed"/>' +
    '<ColorMapEntry color="#89CD89" quantity="103" label="Deciduous"/>' +
    '<ColorMapEntry color="#EFE028" quantity="104" label="Agriculture"/>' +
    '<ColorMapEntry color="#0b4a8b" quantity="105" label="Water"/>' +
  '</ColorMap>' +
'</RasterSymbolizer>';

// Blend data and create a single landcover map
var finalmap = classified.blend(masked);

// Add final map to the display
Map.addLayer(finalmap.sldStyle(urbanPalette), {}, "Land Classification");

//Center the map for display
Map.setCenter(-70.3322, 43.8398, 10);

// Export the land cover classification image, specifying scale and region.
Export.image.toDrive({
  image: finalmap,
  description: 'cumberlandLC',
  scale: 20,
  maxPixels: 1300000000,
});

// //______________________________________________________________________________________________________________________________________//
// //    Edge Classification
// //______________________________________________________________________________________________________________________________________//

// //--------------------------------------------------//
// //    Land Cover Layers
// //--------------------------------------------------//

// // Map cultivated areas on top of edginess
// var agriculture = finalmap.eq(104);
// var maskedAG = agriculture.updateMask(agriculture);
// Map.addLayer(maskedAG, {palette:'EEBC14' }, 'Agriculture');


// // Use forest cover ( combined conifer, mixed, and deciduous) from supervised classification (SLaCC)
// var forestCover = finalmap.gte(101).and(finalmap.lte(103));
// var maskedFC = forestCover.updateMask(forestCover);
// Map.addLayer(maskedFC, {palette:'#0A782D', opacity: 0.8}, 'Forest Cover');

// // Use urban cover (combined low, medium, and high) from supervised classification (SLaCC)
// var urban = finalmap.gte(1).and(finalmap.lte(100));
// var maskedUrban = urban.updateMask(urban);
// Map.addLayer(maskedUrban, {palette: '#400987', opacity: 0.7}, 'Urban');

// //--------------------------------------------------//
// //    Distance Kernel Values  
// //--------------------------------------------------//

// // Find distance to forest
// var forestDist = forestCover.not().distance(ee.Kernel.euclidean({
//   radius: 30,
//   units: 'meters'})).unmask(0).updateMask(maskedFC.mask());
// Map.addLayer(forestDist,{}, "Distance to Forest", false);

// // Find distance to urban
// var urbanDist = urban.not().distance(ee.Kernel.euclidean({
//   radius: 30,
//   units: 'meters'})).unmask(0).updateMask(maskedUrban.mask());
// Map.addLayer(urbanDist, {}, 'Distance to Urban', false);


// //--------------------------------------------------//
// //    Edge Layers using Focal_max
// //--------------------------------------------------//

// // Focal max FOREST
// var focalmax_forest = forestDist.gt(0).focal_max(30, 'square', 'meters').unmask().selfMask();
// Map.addLayer(focalmax_forest, {palette: '84CC94',  opacity: 1}, 'forest focalmax');

// // Focal max URBAN
// var focalmax_urban = urbanDist.gt(0).focal_max(30, 'square', 'meters').unmask().selfMask();
// Map.addLayer(focalmax_urban, {palette: 'C69FF9', opacity: 1}, 'urban focalmax');


// // Create edge map
// //isolate edges where forest and urban touch
// var forestUrbanEdge = focalmax_forest.gte(0).and(focalmax_urban.gte(0));

// Map.addLayer(forestUrbanEdge, {palette: '1C04EC'}, 'forestUrbanEdge');



// //--------------------------------------------------//
// //    Pixel count used to calucate percent Edge     //
// //--------------------------------------------------//

// var totalForestPixels= maskedFC.reduceRegion({
//   reducer: ee.Reducer.sum(),
//   geometry: roi,
//   scale: 30,
//   maxPixels: 1e9
// });
// print('total forest pixels', totalForestPixels);

// var totalUrbanPixels = maskedUrban.reduceRegion({
//   reducer: ee.Reducer.sum(),
//   geometry: roi,
//   scale:30,
//   maxPixels: 1e9
// });
// print( 'total urban pixels', totalUrbanPixels);

// var totalAGPixels = maskedAG.reduceRegion({
//   reducer: ee.Reducer.sum(),
//   geometry: roi,
//   scale: 30,
//   maxPixels: 1e9
// });
// print( 'total agriculture pixels', totalAGPixels);

// var forestEdgePixels = forestDist.gt(0).reduceRegion({
//   reducer: ee.Reducer.sum(),
//   geometry: roi,
//   scale: 30,
//   maxPixels: 1e9
// });
// print('forest edge pixels', forestEdgePixels);


// var urbanEdgePixels = urbanDist.gt(0).reduceRegion({
//   reducer: ee.Reducer.sum(),
//   geometry: roi,
//   scale: 30,
//   maxPixels: 1e9
// });
// print('urban edge pixels', urbanEdgePixels);

// var forestUrbanEdgePixels = forestUrbanEdge.reduceRegion({
//   reducer: ee.Reducer.sum(),
//   geometry: roi,
//   scale: 30,
//   maxPixels: 1e9
// });
// print('total edge pixels', forestUrbanEdgePixels);


// //----------------------------//
// //      ADD A LEGEND***       //
// //----------------------------//

// // Set position of panel
// var legend = ui.Panel({
//   style: {
//     position: 'bottom-left',
//     padding: '8px 15px'
//   }
// });
 
// // Create legend title
// var legendTitle = ui.Label({
//   value: 'Classification',
//   style: {
//     fontWeight: 'bold',
//     fontSize: '18px',
//     margin: '0 0 4px 0',
//     padding: '0'
//     }
// });
 
// // Add the title to the panel
// legend.add(legendTitle);
 
// // Creates and styles 1 row of the legend.
// var makeRow = function(color, name) {
 
//       // Create the label that is actually the colored box.
//       var colorBox = ui.Label({
//         style: {
//           backgroundColor: '#' + color,
//           // Use padding to give the box height and width.
//           padding: '8px',
//           margin: '0 0 4px 0'
//         }
//       });
 
//       // Create the label filled with the description text.
//       var description = ui.Label({
//         value: name,
//         style: {margin: '0 0 4px 6px'}
//       });
 
//       // Return the panel
//       return ui.Panel({
//         widgets: [colorBox, description],
//         layout: ui.Panel.Layout.Flow('horizontal')
//       });
// };
 
// //  Palette with the colors for the legend
// var palette =['0A782D', '84CC94','400987', 'C69FF9', '1C04EC','EEBC14'];
 
// // Names of the legend items
// var names = ['Forest Cover','Forest Edge', 'Urban Development', 'Urban Edge', 'Forest--Urban Edge', 'Agriculture'];
 
// // Add color and and names
// for (var i = 0; i < 6; i++) {
//   legend.add(makeRow(palette[i], names[i]));
//   }  
 
// // Add legend to map
// Map.add(legend);


// // Export the land cover image, specifying scale and region.
// // Change 'image' and 'description' when exporting one specific layer
// Export.image.toDrive({
//   image: forestUrbanEdge,
//   description: 'ForestUrbanEdge',
//   scale: 20,
//   maxPixels: 1300000000,
// });



// // ******Comment the section above, and uncomment the section below to view a different edge map.*******
// // ____________________________________________________________________________________________________________________________________//
// //       Edges using Mid/High Urban vs Forest Cover                                                                                   //
// // ____________________________________________________________________________________________________________________________________//

// // --------------------------------------------------//
// //     Land Cover Layers
// // --------------------------------------------------//

// // Map cultivated areas on top of edginess
// var agriculture = finalmap.eq(104);
// var maskedAG = agriculture.updateMask(agriculture);
// Map.addLayer(maskedAG, {palette:'EEBC14' }, 'Agriculture');


// // Use forest cover (combined conifer, mixed, and deciduous) from supervised classification (SLaCC)
// var forestCover = finalmap.gte(101).and(finalmap.lte(103));
// var maskedFC = forestCover.updateMask(forestCover);
// Map.addLayer(maskedFC, {palette:'#0A782D', opacity: 0.8}, 'Forest Cover');

// // Use urban cover (mid/high) from supervised classification (SLaCC)
// var urban = finalmap.gte(23).and(finalmap.lte(100));
// var maskedUrban = urban.updateMask(urban);
// Map.addLayer(maskedUrban, {palette: '#400987', opacity: 0.7}, 'Mid/High Urban Cover');

// //--------------------------------------------------//
// //   Distance Kernel Values  
// //--------------------------------------------------//

// //Find distance to forest
// var forestDist = forestCover.not().distance(ee.Kernel.euclidean({
//   radius: 30,
//   units: 'meters'})).unmask(0).updateMask(maskedFC.mask());
// Map.addLayer(forestDist,{}, "Distance to Forest", false);

// //Find distance to urban
// var urbanDist = urban.not().distance(ee.Kernel.euclidean({
//   radius: 30,
//   units: 'meters'})).unmask(0).updateMask(maskedUrban.mask());
// Map.addLayer(urbanDist, {}, 'Distance to Urban', false);


// //--------------------------------------------------//
// //   Edge Layers using Focal_max
// //--------------------------------------------------//

// // Focal max FOREST
// var focalmax_forest = forestDist.gt(0).focal_max(30, 'square', 'meters').unmask().selfMask();
// Map.addLayer(focalmax_forest, {palette: '84CC94',  opacity: 1}, 'forest focalmax');

// // Focal max URBAN
// var focalmax_urban = urbanDist.gt(0).focal_max(30, 'square', 'meters').unmask().selfMask();
// Map.addLayer(focalmax_urban, {palette: 'C69FF9', opacity: 1}, 'urban focalmax');


// // Create Edge map
// //isolate edges where forest and urban touch
// var forestUrbanEdge = focalmax_forest.gte(0).and(focalmax_urban.gte(0));

// Map.addLayer(forestUrbanEdge, {palette: '1C04EC'}, 'forestUrbanEdge');



// //--------------------------------------------------//
// //    Pixel count used to calucate percent Edge     //
// //--------------------------------------------------//

// var totalForestPixels= maskedFC.reduceRegion({
//   reducer: ee.Reducer.sum(),
//   geometry: roi,
//   scale: 30,
//   maxPixels: 1e9
// });
// print('total forest pixels', totalForestPixels);

// var totalUrbanPixels = maskedUrban.reduceRegion({
//   reducer: ee.Reducer.sum(),
//   geometry: roi,
//   scale:30,
//   maxPixels: 1e9
// });
// print( 'total urban pixels', totalUrbanPixels);

// var totalAGPixels = maskedAG.reduceRegion({
//   reducer: ee.Reducer.sum(),
//   geometry: roi,
//   scale: 30,
//   maxPixels: 1e9
// });
// print( 'total agriculture pixels', totalAGPixels);

// var forestEdgePixels = forestDist.gt(0).reduceRegion({
//   reducer: ee.Reducer.sum(),
//   geometry: roi,
//   scale: 30,
//   maxPixels: 1e9
// });
// print('forest edge pixels', forestEdgePixels);


// var urbanEdgePixels = urbanDist.gt(0).reduceRegion({
//   reducer: ee.Reducer.sum(),
//   geometry: roi,
//   scale: 30,
//   maxPixels: 1e9
// });
// print('urban edge pixels', urbanEdgePixels);

// var forestUrbanEdgePixels = forestUrbanEdge.reduceRegion({
//   reducer: ee.Reducer.sum(),
//   geometry: roi,
//   scale: 30,
//   maxPixels: 1e9
// });
// print('total edge pixels', forestUrbanEdgePixels);

// //----------------------------//
// //      ADD A LEGEND***       //
// //----------------------------//

// // Set position of panel
// var legend = ui.Panel({
//   style: {
//     position: 'bottom-left',
//     padding: '8px 15px'
//   }
// });
 
// // Create legend title
// var legendTitle = ui.Label({
//   value: 'Classification',
//   style: {
//     fontWeight: 'bold',
//     fontSize: '18px',
//     margin: '0 0 4px 0',
//     padding: '0'
//     }
// });
 
// // Add the title to the panel
// legend.add(legendTitle);
 
// // Creates and styles 1 row of the legend.
// var makeRow = function(color, name) {
 
//       // Create the label that is actually the colored box.
//       var colorBox = ui.Label({
//         style: {
//           backgroundColor: '#' + color,
//           // Use padding to give the box height and width.
//           padding: '8px',
//           margin: '0 0 4px 0'
//         }
//       });
 
//       // Create the label filled with the description text.
//       var description = ui.Label({
//         value: name,
//         style: {margin: '0 0 4px 6px'}
//       });
 
//       // return the panel
//       return ui.Panel({
//         widgets: [colorBox, description],
//         layout: ui.Panel.Layout.Flow('horizontal')
//       });
// };
 
// //  Palette with the colors for the legend
// var palette =['0A782D', '84CC94','400987', 'C69FF9', '1C04EC','EEBC14'];
 
// // Names of the legend items
// var names = ['Forest Cover','Forest Edge', 'Mid/High Urban Development', 'Mid/High Urban Edge', 'Forest--Urban Edges', 'Agriculture'];
 
// // Add color and and names
// for (var i = 0; i < 6; i++) {
//   legend.add(makeRow(palette[i], names[i]));
//   }  
 
// // Add legend to map
// Map.add(legend);



// // Export the land cover image, specifying scale and region.
// // Change 'image' and 'description' when exporting one specific layer
// Export.image.toDrive({
//   image: forestUrbanEdge,
//   description: 'ForestUrbanEdge',
//   scale: 20,
//   maxPixels: 1300000000,
// });



// //***** Comment the section above, and uncomment the section below to view a different edge map. *******
// // ____________________________________________________________________________________________________________________________________//
// //         Edges using Low Urban vs Forest Cover//
// // ______________________________________________________________________________________________________________________________________//

// //--------------------------------------------------//
// //         Land Cover Layers
// //--------------------------------------------------//

// // Map cultivated areas on top of edginess
// var agriculture = finalmap.eq(104);
// var maskedAG = agriculture.updateMask(agriculture);
// Map.addLayer(maskedAG, {palette:'EEBC14' }, 'Agriculture');


// // // Use forest cover (combined conifer, mixed, and deciduous) from supervised classification (SLaCC)
// var forestCover = finalmap.gte(101).and(finalmap.lte(103));
// var maskedFC = forestCover.updateMask(forestCover);
// Map.addLayer(maskedFC, {palette:'#0A782D', opacity: 0.8}, 'Forest Cover');

// // // Use urban cover (low) from supervised classification (SLaCC)
// var urban = finalmap.gte(1).and(finalmap.lte(22));
// var maskedUrban = urban.updateMask(urban);
// Map.addLayer(maskedUrban, {palette: '#400987', opacity: 0.7}, 'Low Urban Cover');

// //--------------------------------------------------//
// //      Distance Kernel Values  
// //--------------------------------------------------//

// // Find distance to forest
// var forestDist = forestCover.not().distance(ee.Kernel.euclidean({
//   radius: 30,
//   units: 'meters'})).unmask(0).updateMask(maskedFC.mask());
// Map.addLayer(forestDist,{}, "Distance to Forest", false);

// // Find distance to urban
// var urbanDist = urban.not().distance(ee.Kernel.euclidean({
//   radius: 30,
//   units: 'meters'})).unmask(0).updateMask(maskedUrban.mask());
// Map.addLayer(urbanDist, {}, 'Distance to Urban', false);

// //--------------------------------------------------//
// //       Edge Layers using Focal_max
// //--------------------------------------------------//

// // Focal max FOREST
// var focalmax_forest = forestDist.gt(0).focal_max(30, 'square', 'meters').unmask().selfMask();
// Map.addLayer(focalmax_forest, {palette: '84CC94',  opacity: 1}, 'forest focalmax');

// // Focal max URBAN
// var focalmax_urban = urbanDist.gt(0).focal_max(30, 'square', 'meters').unmask().selfMask();
// Map.addLayer(focalmax_urban, {palette: 'C69FF9', opacity: 1}, 'urban focalmax');

// // Isolate edges where forest and urban touch
// var forestUrbanEdge = focalmax_forest.gte(0).and(focalmax_urban.gte(0));

// Map.addLayer(forestUrbanEdge, {palette: '1C04EC'}, 'forestUrbanEdge');



// //--------------------------------------------------//
// //    Pixel count used to calucate percent Edge     //
// //--------------------------------------------------//

// var totalForestPixels= maskedFC.reduceRegion({
//   reducer: ee.Reducer.sum(),
//   geometry: roi,
//   scale: 30,
//   maxPixels: 1e9
// });
// print('total forest pixels', totalForestPixels);

// var totalUrbanPixels = maskedUrban.reduceRegion({
//   reducer: ee.Reducer.sum(),
//   geometry: roi,
//   scale:30,
//   maxPixels: 1e9
// });
// print( 'total urban pixels', totalUrbanPixels);

// var totalAGPixels = maskedAG.reduceRegion({
//   reducer: ee.Reducer.sum(),
//   geometry: roi,
//   scale: 30,
//   maxPixels: 1e9
// });
// print( 'total agriculture pixels', totalAGPixels);

// var forestEdgePixels = forestDist.gt(0).reduceRegion({
//   reducer: ee.Reducer.sum(),
//   geometry: roi,
//   scale: 30,
//   maxPixels: 1e9
// });
// print('forest edge pixels', forestEdgePixels);


// var urbanEdgePixels = urbanDist.gt(0).reduceRegion({
//   reducer: ee.Reducer.sum(),
//   geometry: roi,
//   scale: 30,
//   maxPixels: 1e9
// });
// print('urban edge pixels', urbanEdgePixels);

// var forestUrbanEdgePixels = forestUrbanEdge.reduceRegion({
//   reducer: ee.Reducer.sum(),
//   geometry: roi,
//   scale: 30,
//   maxPixels: 1e9
// });
// print('total edge pixels', forestUrbanEdgePixels);

// //----------------------------//
// //      ADD A LEGEND***       //
// //----------------------------//

// // Set position of panel
// var legend = ui.Panel({
//   style: {
//     position: 'bottom-left',
//     padding: '8px 15px'
//   }
// });
 
// // Create legend title
// var legendTitle = ui.Label({
//   value: 'Classification',
//   style: {
//     fontWeight: 'bold',
//     fontSize: '18px',
//     margin: '0 0 4px 0',
//     padding: '0'
//     }
// });
 
// // Add the title to the panel
// legend.add(legendTitle);
 
// // Creates and styles 1 row of the legend.
// var makeRow = function(color, name) {
 
//       // Create the label that is actually the colored box.
//       var colorBox = ui.Label({
//         style: {
//           backgroundColor: '#' + color,
//           // Use padding to give the box height and width.
//           padding: '8px',
//           margin: '0 0 4px 0'
//         }
//       });
 
//       // Create the label filled with the description text.
//       var description = ui.Label({
//         value: name,
//         style: {margin: '0 0 4px 6px'}
//       });
 
//       // return the panel
//       return ui.Panel({
//         widgets: [colorBox, description],
//         layout: ui.Panel.Layout.Flow('horizontal')
//       });
// };
 
// //  Palette with the colors for the legend
// var palette =['0A782D', '84CC94','400987', 'C69FF9', '1C04EC','EEBC14'];
 
// // Names of the legend items
// var names = ['Forest Cover','Forest Edge', 'Low Urban Development', 'Low Urban Edge', 'Forest--Urban Edges', 'Agriculture'];
 
// // Add color and and names
// for (var i = 0; i < 6; i++) {
//   legend.add(makeRow(palette[i], names[i]));
//   }  
 
// // Add legend to map
// Map.add(legend);


// // Export the land cover image, specifying scale and region.
// // Change 'image' and 'description' when exporting one specific layer
// Export.image.toDrive({
//   image: forestUrbanEdge,
//   description: 'ForestUrbanEdge',
//   scale: 20,
//   maxPixels: 1300000000,
// });

// //// *****End of code*****


//// ____________________________________________________________________________________________________________________________________//
////            Edge Map README
//// ______________________________________________________________________________________________________________________________________//

//// Run the script by clicking 'Run' in the top right; this will launch the map creation and export option.
////     Generate the map of interest, then export by clicking the orange 'Tasks' tab. Select the blue 'Run' button
////         next to the layer of interest and then click 'Run' on the pop-up.
////     The files will be downoaded from GEE straight to your Google Drive as GeoTIFFs.
////     The downloaded GeoTiffs are a single-band raster.
    
//// When running the script, keep in mine that the study area is set to Cumberland County, ME. This can be changed to look at the towns
////     of Cumberland County by adjusting the 'roi' geometry.
////     To change the study area from Cumberland County, first alter the data import and classification found in the SLaCC script above, then use those classes for the Edge layers.
////     To find the edges between other land cover types besides forest cover and urban cover, you will need to change the 'Land Cover Layers' section found at the beginning of each section according to the classification ranges.
//// This script's data range uses the range in the SLaCC land cover map. 

//// After running the script, to find the percentage of edge in Cumberland County, use the pixel counts calculated in the 'Console' tab.
////     to find total Forest--Urban Edge percentage:
////         add total forest, urban, and agriculture pixels together
////         Divide the total edge pixels by that sum.

//////////LEGAL/////////

//////////Notices:

//////////Copyright 2021 United States Government as represented by the Administrator of the National Aeronautics and Space Administration. 
//////////All Rights Reserved.

//////////Third Party Software:

//////////This software derives analyses using Google Earth Engine's (GEE’s) free and publicly accessible data catalog. 
//////////GEE is not bundled with this software, but users of this software must obtain their own account at code.earthengine.google.com, 
//////////which is subject to the terms and conditions of its licensor, as applicable at the time of licensing. 
//////////License hyperlink is provided here for information purposes only: https://earthengine.google.com/terms/.

//////////Disclaimers

//////////No Warranty: THE SUBJECT SOFTWARE IS PROVIDED "AS IS" WITHOUT ANY WARRANTY OF ANY KIND, EITHER EXPRESSED, IMPLIED, OR STATUTORY, INCLUDING, 
//////////BUT NOT LIMITED TO, ANY WARRANTY THAT THE SUBJECT SOFTWARE WILL CONFORM TO SPECIFICATIONS, ANY IMPLIED WARRANTIES OF MERCHANTABILITY, FITNESS FOR A 
//////////PARTICULAR PURPOSE, OR FREEDOM FROM INFRINGEMENT, ANY WARRANTY THAT THE SUBJECT SOFTWARE WILL BE ERROR FREE, OR ANY WARRANTY THAT DOCUMENTATION, 
//////////IF PROVIDED, WILL CONFORM TO THE SUBJECT SOFTWARE. THIS AGREEMENT DOES NOT, IN ANY MANNER, CONSTITUTE AN ENDORSEMENT BY GOVERNMENT AGENCY OR ANY PRIOR RECIPIENT OF ANY RESULTS, 
//////////RESULTING DESIGNS, HARDWARE, SOFTWARE PRODUCTS OR ANY OTHER APPLICATIONS RESULTING FROM USE OF THE SUBJECT SOFTWARE.  
//////////FURTHER, GOVERNMENT AGENCY DISCLAIMS ALL WARRANTIES AND LIABILITIES REGARDING THIRD-PARTY SOFTWARE, IF PRESENT IN THE ORIGINAL SOFTWARE, AND DISTRIBUTES IT "AS IS."

//////////Waiver and Indemnity:  RECIPIENT AGREES TO WAIVE ANY AND ALL CLAIMS AGAINST THE UNITED STATES GOVERNMENT, ITS CONTRACTORS AND SUBCONTRACTORS, 
//////////AS WELL AS ANY PRIOR RECIPIENT.  IF RECIPIENT'S USE OF THE SUBJECT SOFTWARE RESULTS IN ANY LIABILITIES, DEMANDS, DAMAGES, EXPENSES OR LOSSES 
//////////ARISING FROM SUCH USE, INCLUDING ANY DAMAGES FROM PRODUCTS BASED ON, OR RESULTING FROM, RECIPIENT'S USE OF THE SUBJECT SOFTWARE, RECIPIENT SHALL 
//////////INDEMNIFY AND HOLD HARMLESS THE UNITED STATES GOVERNMENT, ITS CONTRACTORS AND SUBCONTRACTORS, AS WELL AS ANY PRIOR RECIPIENT, TO THE EXTENT PERMITTED BY LAW.  
//////////RECIPIENT'S SOLE REMEDY FOR ANY SUCH MATTER SHALL BE THE IMMEDIATE, UNILATERAL TERMINATION OF THIS AGREEMENT.
