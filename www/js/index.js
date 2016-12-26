/*
 * Licensed to the Apache Software Foundation (ASF) under one
 * or more contributor license agreements.  See the NOTICE file
 * distributed with this work for additional information
 * regarding copyright ownership.  The ASF licenses this file
 * to you under the Apache License, Version 2.0 (the
 * "License"); you may not use this file except in compliance
 * with the License.  You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

// Initialize Firebase
var config = {
  apiKey: **,
  authDomain: **,
  databaseURL: **,
  storageBucket: **,
  messagingSenderId: **
};
firebase.initializeApp(config);

var database = firebase.database();

var artItems = [];
var googlePlaceResults = [];

var queryRequestCount = 0;

var placeRecordId = 0;
var viewAssembler = new ViewAssembler();

var infoBubble;
var map;
var pdxLatLng;
var currentLat;
var currentLng;


var app = {
    // Application Constructor
    initialize: function() {
        this.bindEvents();
    },
    // Bind Event Listeners
    //
    // Bind any events that are required on startup. Common events are:
    // 'load', 'deviceready', 'offline', and 'online'.
    bindEvents: function() {
        document.addEventListener('deviceready', this.onDeviceReady, false);
    },
    // deviceready Event Handler
    //
    // The scope of 'this' is the event. In order to call the 'receivedEvent'
    // function, we must explicitly call 'app.receivedEvent(...);'
    onDeviceReady: function() {
        app.receivedEvent('deviceready');
    },
    // Update DOM on a Received Event
    receivedEvent: function(id) {
        $.getScript('https://maps.googleapis.com/maps/api/js?key=mykey&sensor=true&libraries=places&callback=onMapsApiLoaded');

        document.addEventListener("backbutton", onBackKey, false);

//        console.log('Received Event: ' + id);
    }
};

app.initialize();


(function (global) {
    "use strict";

    global.onMapsApiLoaded = function () {
        // Maps API loaded and ready to be used.
        pdxLatLng = new google.maps.LatLng(45.522886, -122.677631);

        loadTemplates( setupDefaultView );
    };

})(window);

function getArtItems() {
    firebase.database().ref().once('value')
    .then(function(snapshot) {
      var artData = snapshot.val();
      onFirebaseSuccess(artData);
    })
    .catch(function(error) {
//      console.log('Firebase Synchronization failed');
      onFirebaseError(error);
    });
}

function getMyLocation() {
    if (navigator.geolocation) {
        var options = { maximumAge: 5000, timeout: 5000, enableHighAccuracy: true };
        navigator.geolocation.getCurrentPosition(onGeoSuccess, onGeoError, options);
    } else {
        alert('Geolocation is not supported. We will use Downtown Portland, OR as your current location.');
        currentLat = 45.522886;
        currentLng = -122.677631;
    }
}

function onGeoSuccess(position) {
    currentLat = parseFloat( position.coords.latitude );
    currentLng = parseFloat( position.coords.longitude );

    var marker = new google.maps.Marker({
        position:new google.maps.LatLng(currentLat, currentLng),
        map:map,
        title: "You are here!"
    });
}


function onGeoError(error) {
//        alert('code: '    + error.code    + '\n' + 'message: ' + error.message + '\n');
    // error.code can be:
    //   0: unknown error
    //   1: permission denied
    //   2: position unavailable (error response from locaton provider)
    //   3: timed out
}


function setupDefaultView() {

    var mapView = {view: viewAssembler.mapArtView(),
        title: "PDX Art Trekker",
        scroll:false
    };

    //Setup the ViewNavigator
    window.viewNavigator = new ViewNavigator( 'body' );
    window.viewNavigator.pushView( mapView );
}


function onFirebaseSuccess(results) {
    for (var i = 0; i < results.length; i++) {
        artItems.push(results[i]);
    }

    if (results.length > 0){
        createArtMarkers(results);
        preloadImages(results);
    }

    removeLoadingMsg();
    getGooglePlaces();
}

function onFirebaseError(error) {
    alert("We encountered an error when retrieving the data: " + error.code + " " + error.message);
    removeLoadingMsg();
}

function getGooglePlaces() {
    // get google places
    var request = {
        location: pdxLatLng,
        radius: 8000,
        types:['museum','art_gallery']
    };

    var service = new google.maps.places.PlacesService(map);
    service.nearbySearch(request, callback);
}

function callback(results, status, pagination) {
    if (status == google.maps.places.PlacesServiceStatus.OK) {
        createGooglePlaceMarkers(results);
        if (pagination.hasNextPage) {
            setTimeout( function () {
                pagination.nextPage();
            }, 100 );
        }
    } else {
        alert("We encountered an error when retrieving the google places data.");
    }
    getMyLocation();
}

function removeLoadingMsg() {
    // wait about 2 more seconds before removing this msg
    setTimeout( function () {
        if (document.getElementById("loadingData")){
            document.getElementById("loadingData").style.display = 'none';
        }
    }, 2000 );
}

function preloadImages(items) {
    if (!preloadImages.list) {
        preloadImages.list = [];
    }
    for (var i = 0; i < items.length; i++) {
        var art = items[i];
        var img = new Image();
        img.src = art.image_url;
        preloadImages.list.push(img);
    }
}

function onAboutViewClick( event ) {
    var view = { title: "About",
        view: viewAssembler.aboutView(),
        backLabel: " "
    };
    window.viewNavigator.pushView( view );
    event.stopPropagation();
    return false;
}

function onGalleryViewClick( event ) {
    var view = { title: "Gallery",
        view: viewAssembler.galleryView(0, 50, artItems, false, true),
        backLabel: " "
    };
    window.viewNavigator.pushView( view );

    event.stopPropagation();
    return false;
}

function onFavViewClick( event ) {
    populateFavoritesGallery(null);
    event.stopPropagation();
    return false;
}

function populateFavoritesGallery(option) {
    if (option == 'clear') {
        var result=confirm("Are you sure you want to delete all your favorites?");
        if (result==true) {
            localStorage.clear();
        } else {
            return;
        }
    }

    var favs = [];
    for (key in localStorage){
        if (localStorage.getItem(key) == "artRecordId") {
            var artItem = getArtItemFromRecordId(key);
            if (artItem != null) {
                favs.push(artItem);
            }
        }
    }

    var view = { title: "Favorites",
        view: viewAssembler.galleryView(0, favs.length, favs, true, false),
        backLabel: " "
    };

    if (option =='refresh' || option == 'clear') {
        view.view.children().remove();
        view.view.append( viewAssembler.galleryView(0, favs.length, favs, true, false));
        window.viewNavigator.replaceView( view );
    } else {
        if (favs.length > 0) {
            window.viewNavigator.pushView( view );
        } else {
            alert("You have not selected any favorites.");
        }
    }
}

function getMoreImagesInGallery(startIndex, endIndex) {

    var view = { title: "Gallery",
        view: viewAssembler.galleryView(startIndex, endIndex, artItems, false, true),
        backLabel: " "
    };

    view.view.children().remove();
    view.view.append( viewAssembler.galleryView(startIndex, endIndex, artItems, false, true));
    window.viewNavigator.replaceView( view );
}

function distance( lat1, lon1, lat2, lon2 ) {
    var Rk = 6371; // Radius of the earth in km
    var Rm = 3961; // Radius pf the earth in miles
    var dLat = toRad(lat2-lat1);  // Javascript functions in radians
    var dLon = toRad(lon2-lon1);
    var a = Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
      Math.sin(dLon/2) * Math.sin(dLon/2);
    var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    var d = Rk * c; // Distance in km
    var m = Rm * c; // Distance in miles
    return m;
}

function toRad(degree)
{
    rad = degree* Math.PI/ 180;
    return rad;
}

function getDisciplineColor(discipline) {

    var marker = "yellow"

    if (discipline != null){
        switch (discipline.toLowerCase()){
            case "sculpture":
                marker = "blue";
                break;
            case "painting":
                marker = "green";
                break;
            case "ceramic":
            case "fiber":
                marker = "lightblue";
                break;
            case "architectural integration":
                marker = "purple";
                break;
            case "mural":
                marker = "pink";
                break;
            case "photography":
                marker = "orange";
                break;
            default:
                marker = "yellow"
        }
    }
    return marker;
}


function showPlaceDetailsFromMapClick(recordId) {
    infoBubble.close();

    var foundPlace = false;
    var place;
    for (var i=0; i < googlePlaceResults.length; i++ ) {
        place = googlePlaceResults[i];
        if (place.recordId == recordId) {
            foundPlace=true;
            break;
        }
    }

    if (foundPlace) {
        var request = {
            reference:place.reference
        };

        var service = new google.maps.places.PlacesService(map);
        service.getDetails(request, placeDetailCallback);
    }
}

function placeDetailCallback(placeDetailResult, status) {
    if (status == google.maps.places.PlacesServiceStatus.OK) {
        var view = {title: "Details",
            backLabel: " ",
            view: viewAssembler.placeDetailView(placeDetailResult)
        };
        window.viewNavigator.pushView(view);
    }
}

function getArtItemFromRecordId(recordId) {
    for (var i=0; i < artItems.length; i++ ) {
        var art = artItems[i];
        if (art.record_id == recordId) {
            return art;
        }
    }
    return null;
}

function showArtDetailsFromMapClick(recordId) {
    infoBubble.close();

    var foundArt = false;
    var art;
    for (var i=0; i < artItems.length; i++ ) {
        art = artItems[i];
        if (art.record_id == recordId) {
            foundArt=true;
            break;
        }
    }

    if (foundArt) {
        var view = {title: "Details",
            backLabel: " ",
            view: viewAssembler.artDetailView(art)
        };
        window.viewNavigator.pushView(view);
    }
}

function onArtListItemClick( event ) {
    var target = $( event.target )
    if (target.get(0).nodeName.toUpperCase() != "LI") {
        target=target.parent();
    }
    var recordId = target.attr( "index" );
    recordId = parseInt( recordId );
    showArtDetailsFromMapClick( recordId );
}


function onArtListViewClick( event ) {

    setTimeout( function(){
        var view = { title: "Nearby Art",
            view: viewAssembler.artListView(),
            backLabel: (" "),
            scroll:true
        };

        window.viewNavigator.pushView( view );
    }, 500 );

    event.stopPropagation();
    return false;
}


function openExternalURL( url ) {
    var result=confirm("You will leave the PDX Art Trekker App. Continue?");
    if (result==true) {
        window.open(url, '_blank', 'location=yes');
    }
}

function addToFav(add, recordId ) {
    if(typeof(Storage)!=="undefined"){
        if (add) {
            localStorage.setItem(recordId, "artRecordId");
        } else {
            localStorage.removeItem(recordId);
        }
    } else {
//        console.log("browser does not support local storage");
    }
}


function createArtMarkers(items) {
    for (var i = 0; i < items.length; i++) {
        var art = items[i];

        var geo = new google.maps.LatLng(art.lat, art.lng);

        var mapIcon = "assets/graphics/map_icons/" + getDisciplineColor(art.discipline) + ".png";

        var marker = new google.maps.Marker({
            map:map,
            position:geo,
            icon:mapIcon
        });

        // Creating a closure to retain the correct data
        (function (marker, art) {

            // Attaching a click event to the current marker
            google.maps.event.addListener(marker, "click", function () {
                var img = "<a href='javascript:showArtDetailsFromMapClick(" + art.record_id + ");'>" +
                  "<div id='artMarker'><img class='img-polaroid' src=" + art.image_url + " width='144'/><p>" + art.title + "</p></div></a>";
                infoBubble.setContent(img);
                infoBubble.open(map, marker);
            });
        })(marker, art);
    }
}

function createGooglePlaceMarkers(results) {
    for (var i = 0; i < results.length; i++) {
        var place = results[i];

        place.recordId = ++placeRecordId;

        googlePlaceResults.push(place);

        var icon = "assets/graphics/map_icons/brown_MarkerG.png";

        for (var j = 0; j < place.types.length; j++) {
            var type = place.types[j];
            if (type == "museum"){
                icon = "assets/graphics/map_icons/yellow_MarkerM.png";
                break;
            }
        }

        var marker = new google.maps.Marker({
            map: map,
            position: place.geometry.location,
            icon: icon
        });

        (function (marker, place) {
            google.maps.event.addListener(marker, 'click', function() {
                var img = "<a href='javascript:showPlaceDetailsFromMapClick(" + place.recordId + ");'>"+"<div id='placesMarker'><p>" + place.name + "</p></div></a>";
                infoBubble.setContent(img);
                infoBubble.open(map, marker);
            });
        })(marker, place);
    }
}


function onBackKey( event ) {

    if ( window.viewNavigator.history.length > 1 ){
        event.preventDefault();
        window.viewNavigator.popView();

        return false;
    }
    navigator.app.exitApp();
}
