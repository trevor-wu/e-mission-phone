'use strict';
angular.module('emission.main.diary.detail',['ui-leaflet', 'ng-walkthrough',
                                      'nvd3', 'emission.plugin.kvstore',
                                      'emission.services', 'emission.plugin.logger',
                                      'emission.incident.posttrip.manual'])

.controller("DiaryDetailCtrl", function($scope, $rootScope, $window, $stateParams, $ionicActionSheet, $ionicLoading, $http,
                                        leafletData, leafletMapEvents, nzTour, KVStore,
                                        Logger, Timeline, DiaryHelper, Config,
                                        CommHelper, PostTripManualMarker) {
  console.log("controller DiaryDetailCtrl called with params = "+
    JSON.stringify($stateParams));

  $scope.mapCtrl = {};
  angular.extend($scope.mapCtrl, {
    defaults : {
    }
  });


  angular.extend($scope.mapCtrl.defaults, Config.getMapTiles())

  var mapEvents = leafletMapEvents.getAvailableMapEvents();
  for (var k in mapEvents) {
    var eventName = 'leafletDirectiveMap.detail.' + mapEvents[k];
    $scope.$on(eventName, function(event, data){
        console.log("in mapEvents, event = "+JSON.stringify(event.name)+
              " leafletEvent = "+JSON.stringify(data.leafletEvent.type)+
              " leafletObject = "+JSON.stringify(data.leafletObject.getBounds()));
        $scope.eventDetected = event.name;
    });
  }

  /*
  leafletData.getMap('detail').then(function(map) {
    map.on('touch', function(ev) {
      alert("touch" + ev.latlng); // ev is an event object (MouseEvent in this case)
    });
  });
  */

  $scope.$on('leafletDirectiveMap.detail.resize', function(event, data) {
      console.log("diary/detail received resize event, invalidating map size");
      data.leafletObject.invalidateSize();
  });
  $scope.name = "Cannot Retrieve Suggestion";
  $scope.mode = "Cannot Retrieve Mode";
  $scope.bid = "";
  $scope.stars = 4.5;
  $scope.rating = "";
  $http.get('json/yelpfusion.json').then(function(result) {
        $scope.yelp = result.data;
      }
  )
  $scope.refreshTiles = function() {
      $scope.$broadcast('invalidateSize');
  };
  $scope.getIndividualSuggestion = function() {
    $ionicLoading.show({
        template: 'Loading...'
        });
    CommHelper.getSingleTripSuggestion($stateParams.tripId).then(function(result) {
      console.log(result);
      $ionicLoading.hide();
      $scope.name = result.message;
      $scope.mode = result.method;
      $scope.bid = result.businessid;
      $scope.stars = result.rating;
    }).catch(function(err) {
      console.log("Error while getting individual suggestion" + err);
    });
  };
  $scope.clickReview = function() {
    $ionicLoading.show({
      template: 'Loading Reviews...'
      });
    $http({
      "async": true,
      "crossDomain": true,
      "url": "https://api.yelp.com/v3/businesses/"+$scope.bid+"/reviews",
      "method": "GET",
      "headers": $scope.yelp.headers
    }).then(function(res) {
      $scope.revs = res.data.reviews;
      $scope.rating = "img/small/small_"+$scope.stars+".png";
    });
    $ionicLoading.hide();
  };

  $scope.getFormattedDate = DiaryHelper.getFormattedDate;
  $scope.arrowColor = DiaryHelper.arrowColor;
  $scope.parseEarlierOrLater = DiaryHelper.parseEarlierOrLater;
  $scope.getEarlierOrLater = DiaryHelper.getEarlierOrLater;
  $scope.getLongerOrShorter = DiaryHelper.getLongerOrShorter;
  $scope.getIcon = DiaryHelper.getIcon;
  $scope.getHumanReadable = DiaryHelper.getHumanReadable;
  $scope.getPercentages = DiaryHelper.getPercentages;
  $scope.allModes = DiaryHelper.allModes;
  $scope.trip = Timeline.getTrip($stateParams.tripId);
  $scope.getKmph = DiaryHelper.getKmph;
  $scope.getFormattedDistance = DiaryHelper.getFormattedDistance;
  $scope.getSectionDetails = DiaryHelper.getSectionDetails;
  $scope.getFormattedTime = DiaryHelper.getFormattedTime;
  $scope.getFormattedTimeRange = DiaryHelper.getFormattedTimeRange;
  $scope.getFormattedDuration = DiaryHelper.getFormattedDuration;
  $scope.getTripDetails = DiaryHelper.getTripDetails;
  $scope.tripgj = DiaryHelper.directiveForTrip($scope.trip);
  $scope.name = "Click on the suggestion button for a suggestion for this trip";
  $scope.mode = "Mode of Transporation";

  $scope.getTripBackground = function() {
     var ret_val = DiaryHelper.getTripBackground($scope.tripgj);
     return ret_val;
  }

  console.log("trip.start_place = " + JSON.stringify($scope.trip.start_place));

  leafletData.getMap('detail').then(function(map) {
    map.on('click', PostTripManualMarker.startAddingIncidentToTrip($scope.trip, map));
  });

  var data  = [];
  var start_ts = $scope.trip.properties.start_ts;
  var totalTime = 0;
  for (var s in $scope.tripgj.sections) {
    // ti = time index
    for (var ti in $scope.tripgj.sections[s].properties.times) {
      totalTime = ($scope.tripgj.sections[s].properties.times[ti] - start_ts);
      data.push({x: totalTime, y: $scope.tripgj.sections[s].properties.speeds[ti] });
    }
  }
  var dataset = {
      values: data,
      key: 'Speed',
      color: '#7777ff',
    }
  var chart = nv.models.lineChart()
                .margin({left: 65, right: 10})  //Adjust chart margins to give the x-axis some breathing room.
                .useInteractiveGuideline(false)  //We want nice looking tooltips and a guideline!
                .x(function(t) {return t.x / 60})
                .showLegend(true)       //Show the legend, allowing users to turn on/off line series.
                .showYAxis(true)        //Show the y-axis
                .showXAxis(true);        //Show the x-axis
  chart.xAxis
    .tickFormat(d3.format(".1f"))
    .axisLabel('Time (mins)');

  chart.yAxis     //Chart y-axis settings
      .axisLabel('Speed (m/s)')
      .tickFormat(d3.format('.1f'));

  d3.select('#chart svg')    //Select the <svg> element you want to render the chart in.
      .datum([dataset,])         //Populate the <svg> element with chart data...
      .call(chart);          //Finally, render the chart!


  //Update the chart when window resizes.
  nv.utils.windowResize(chart.update);
  nv.addGraph(chart);

  /* START: ng-walkthrough code */
  // Tour steps
  var tour = {
    config: {
      mask: {
        visibleOnNoTarget: true,
        clickExit: true
      }
    },
    steps: [{
      target: '#detail',
      content: 'To report an incident, zoom in as much as possible to the location where the incident occurred and click on the trip to mark a &#x263B; or &#x2639; incident'
    }, {
      target: '#sectionList',
      content: 'Trip sections, along with times and modes'
    }, {
      target: '#sectionPct',
      content: '% of time spent in each mode for this trip'
    }]
  };

  var startWalkthrough = function () {
    nzTour.start(tour).then(function(result) {
      Logger.log("detail walkthrough start completed, no error");
    }).catch(function(err) {
      Logger.log("detail walkthrough start errored" + err);
    });
  };


  var checkDetailTutorialDone = function () {
    var DETAIL_DONE_KEY = 'detail_tutorial_done';
    var detailTutorialDone = KVStore.getDirect(DETAIL_DONE_KEY);
    if (!detailTutorialDone) {
      startWalkthrough();
      KVStore.set(DETAIL_DONE_KEY, true);
    }
  };

  $scope.startWalkthrough = function () {
    startWalkthrough();
  }

  $scope.$on('$ionicView.afterEnter', function(ev) {
    // Workaround from
    // https://github.com/driftyco/ionic/issues/3433#issuecomment-195775629
    if(ev.targetScope !== $scope)
      return;
    checkDetailTutorialDone();
  });
  /* END: ng-walkthrough code */
})
