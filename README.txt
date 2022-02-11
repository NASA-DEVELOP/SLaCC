=============================================
 SUPERVISED LAND COVER CLASSIFICATION (SLaCC) 
=============================================

Date Created: June 12, 2019

Part 1 of this script allows users to create a supervised land cover map over a region. Currently the script is set for Cumberland County, Maine. Part 2 of this script allows user to create a map that displays the "edges" of chosen land covers. 

 Required Packages
===================
// * Google Earth Engine API
// * Required Data Inputs: Landsat 8 OLI, National Land Cover Database (NLCD), Region of Interest (roi) geometry, CCmaine shapefile
// * Training data: agriculture, water, coniferous, mixed, and deciduous training points included in the "SLaCC_trainingdata" folder

 Parameters
-------------
To access the land cover data:
  Click “Run” in the top right corner of the main command window to launch the user interface panel. 
	To export the data displayed on the map, click the orange "Tasks" tab and click the "run" button next to the desired layer. 
	This will export the map as a GeoTiff file to your Google Drive. This will take a few minutes to complete. 
  See SLaCC README script for more information.

To access the edge map data:
  Uncomment the edge map location script, and uncomment one map only (i.e., 'Edge Classification', ' Edges using Mid/High Urban vs Forest Cover', and ' Edges using Low Urban vs Forest Cover')
	Click "Run: in the top right corner of the main command window to launch the user interface panel. Then uncheck the 'Geometry Imports' tab at the top left of the map.
	To export the data displayed on the map:
	  Choose which final layer you would like exported, enter it under the title of the "Export" section.
	  Click the orange "Tasks" tab and click "run" next to the desired layer.
	  This will export the map as a GeoTiff file to your Google Drive. This will take a few minutes to complete.


 Contact
---------
Name: Britnay Beaudry, Celeste Gambino, Monica Colmenares
E-mail(s): britnaybeaudry@gmail.com, cmgambino16@gmail.com, monica.colmenares34@gmail.com


//--------------------------------------------------------------------
//                              SLaCC README
//--------------------------------------------------------------------

// Upload the training data and CCmaine shapefile from the 'SLaCC_trainingdata' folder to Google Earth Engine. Instructions how to do that
// can be found here: https://developers.google.com/earth-engine/guides/table_upload 
// Make sure that training data and shapefile names match their names provided in the 'SLaCC_trainingdata' folder.

// Run the script by clicking "Run" in the top right, this will launch the classification and export option. 
    // Generate the map of interest, then export by clicking the orange "Tasks" tab. Select the blue "Run" button next to the layer of interest and then click "Run" on the pop-up.
    // The files will be downloaded from GEE straight to your Google Drive as GeoTIFFs. 
    // The downloaded GeoTIFFs are a single-band raster.

// When running the script, please keep in mind: 
    // The date range is currently set for 2018-07-12, 2018-07-30. 
        // If you would like to change this range or extend this into later months, change the dates on lines 46 with the format 'year - two digit month - two digit day'.
    // You can change the name of the files that are generated for download by changing the description on line 237. 
    

// If you want to change the study area, this will require different data import and classification steps.
    // Alter lines 47, 69, 77, and 79 to import a different shapefile for your classificstion. Alternatively, you can just name it CCmaine. 
    // If you are classifying a new area, the classes used here and described on lines 89-94 may be different in the new geographic region. Selecting new training points for the existing classes will tailor the classification to your area. 
    // Any newly added class need to be a featureCollection with the property "landcover" with a unique number ID. 
    // Any new classes will need to be added to line 97, the final palette section on lines 211-223, line 197, and line 200. 

//// __________________________________________//
////            Edge Map README
//// ____________________________________________//

/// Draw a geometry polygon over your region of interest in the map area of the tool and name it 'roi'.

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

//// AFter running the script, to find the percentage of edge in Cumberland County, use the pixel counts calculated in the 'Console' tab.
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
