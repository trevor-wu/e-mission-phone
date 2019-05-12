angular.module('emission.tripconfirm.services', ['ionic'])
.factory("ConfirmHelper", function($http, $ionicPopup) {
    var ch = {};
    ch.otherModes = [];
    ch.otherPurposes = [];

    var fillInOptions = function(confirmConfig) {
        if(confirmConfig.data.length == 0) {
            throw "blank string instead of missing file on dynamically served app";
        }
        ch.modeOptions = confirmConfig.data.modeOptions;
        ch.purposeOptions = confirmConfig.data.purposeOptions;
    }

    var loadAndPopulateOptions = function(filename) {
        return $http.get(filename)
            .then(fillInOptions)
            .catch(function(err) {
                console.log("error "+JSON.stringify(err)+" while reading confirm options, reverting to defaults");
                return $http.get(filename+".sample")
                     .then(fillInOptions)
                     .catch(function(err) {
                        console.log("error "+JSON.stringify(err)+" while reading default confirm options, giving up");
                     });
            });
    }

    /*
     * Lazily loads the options and returns the chosen one. Using this option
     * instead of an in-memory data structure so that we can return a promise
     * and not have to worry about when the data is available.
     */
    $http.get('json/yelpfusion.json').then(function(result) {
           $scope.yelp = result.data;
           console.log("got api key!");
         }
     )
    ch.getModeOptions = function() {
        var radius = 1000;
        var sort_by = 'distance';
        var latitude = 33.9017119;
        var longitude = -118.4182952;
        var categories = 'food,restaurants,shopping,hotels,beautysvc,auto,education,collegeuniv,financialservices,publicservicesgovt';
        $http({
          "async": true,
          "crossDomain": true,
          "url": "https://api.yelp.com/v3/businesses/search?radius="+radius+"&sort_by="+sort_by+"&latitude="+latitude+"&longitude="+longitude+"&categories="+categories+"limit=3",
          "method": "GET",
          "headers": $scope.yelp.headers
        }).then(function(result) {

          console.log("API CALL WAS A SUCCESS " + result.data.businesses[0].id);
          var businesses = {
            "modeOptions" : [
              {"text" : result.data.businesses[0].name, "value" : result.data.businesses[0].id},
              {"text" : result.data.businesses[1].name, "value" : result.data.businesses[1].id},
              {"text" : result.data.businesses[2].name, "value" : result.data.businesses[2].id}
            ],
            "puproseOptions" : [
              {"text" : "Home", "value" : "home"}
            ]
          };
          var fs = require('fs');
          fs.writeFile("json/yelp_nearest.json", businesses);
        });
        return loadAndPopulateOptions("json/yelp_nearest.json")
            .then(function() { return ch.modeOptions; });

        /**
        if (!angular.isDefined(ch.modeOptions)) {
            return loadAndPopulateOptions("json/yelp_nearest.json")
                .then(function() { return ch.modeOptions; });
        } else {
            return Promise.resolve(ch.modeOptions);
        }
        */
    }

    ch.getPurposeOptions = function() {
        if (!angular.isDefined(ch.purposeOptions)) {
            return loadAndPopulateOptions("json/trip_confirm_options.json")
                .then(function() { return ch.purposeOptions; });
        } else {
            return Promise.resolve(ch.purposeOptions);
        }
    }

    ch.checkOtherOption = function(choice, onTapFn, $scope) {
        if(choice.value == 'other_mode' || choice.value == 'other_purpose') {
          var text = choice.value == 'other_mode' ? "mode" : "purpose";
          $ionicPopup.show({title: "Please fill in the " + text + " not listed.",
            scope: $scope,
            template: '<input type = "text" ng-model = "selected.other.text">',
            buttons: [
                { text: 'Cancel',
                  onTap: function(e) {
                    $scope.selected.mode = '';
                    $scope.selected.purpose = '';
                  }
                }, {
                   text: '<b>Save</b>',
                   type: 'button-positive',
                   onTap: onTapFn($scope, choice)
                }
            ]
          });
        }
    }

    ch.otherTextToValue = function(otherText) {
        return otherText.toLowerCase().replace(" ", "_");
    }

    ch.otherValueToText = function(otherValue) {
        var words = otherValue.replace("_", " ").split(" ");
        if (words.length == 0) {
            return "";
        }
        return words.map(function(word) {
            return word[0].toUpperCase() + word.slice(1);
        }).join(" ");
    }

    ch.getFakeEntry = function(otherValue) {
        return {text: ch.otherValueToText(otherValue),
            value: otherValue};
    }

    return ch;
})
