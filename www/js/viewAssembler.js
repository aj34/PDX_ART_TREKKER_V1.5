
var templates = {
    aboutViewTemplate:"views/aboutViewTemplate.html",
    mapArtViewTemplate:"views/mapArtViewTemplate.html",
    artListViewTemplate:"views/artListViewTemplate.html",
    artDetailViewTemplate:"views/artDetailViewTemplate.html",
    placeDetailViewTemplate:"views/placeDetailViewTemplate.html",
    galleryViewTemplate:"views/galleryViewTemplate.html",
    loaded: 0,
    requested: 0
};

var ___templatesLoadedCallback;

var touchStartColor = "#d9cf67";  //highlight yellow
var touchEndColor = "#aaa660";   //gold

function loadTemplates(callback) {
    ___templatesLoadedCallback = callback;
    
    //load Mousetache HTML templates
    for (var key in templates) {
        (function() {
             var _key = key.toString();
             if ( _key != "loaded" && _key != "requested" ){
                 templates.requested ++;
                 
                 var templateLoaded = function( template ){
                    onTemplateLoaded( template, _key );
                 }
                 
                 $.get( templates[ _key ], templateLoaded, "html" );
             }
         })();
    }
}

function onTemplateLoaded(template, key) {
    
    //alert( key + ": " + template);
    templates[ key ] = template;
    templates.loaded ++;
    
    if ( templates.loaded == templates.requested ) {
        ___templatesLoadedCallback();
    }
}

function ViewAssembler() {
 //   this.touchSupported = 'ontouchstart' in window;
 //   this.CLICK_EVENT = this.touchSupported ? 'touchend' : 'click';
    this.CLICK_EVENT = 'click';
    return this;
}

ViewAssembler.prototype.aboutView = function() {
    var el = $( templates.aboutViewTemplate );
    return el;
}

ViewAssembler.prototype.mapArtView = function() {
    var el = $( templates.mapArtViewTemplate );

    el.find("#galleryButton").on( this.CLICK_EVENT, onGalleryViewClick );
    el.find("#artNearbyButton").on( this.CLICK_EVENT, onArtListViewClick );
    el.find("#favButton").on( this.CLICK_EVENT, onFavViewClick);
    el.find("#aboutButton").on( this.CLICK_EVENT, onAboutViewClick );

    el.find("#galleryButton").bind('touchstart', function(){
        $("#galleryButton").css("background-color", touchStartColor);
    }).bind('touchend', function(){
            $("#galleryButton").css("background-color", touchEndColor);
        });

    el.find("#artNearbyButton").bind('touchstart', function(){
        $("#artNearbyButton").css("background-color", touchStartColor);
    }).bind('touchend', function(){
            $("#artNearbyButton").css("background-color", touchEndColor);
        });

    el.find("#favButton").bind('touchstart', function(){
        $("#favButton").css("background-color", touchStartColor);
    }).bind('touchend', function(){
            $("#favButton").css("background-color", touchEndColor);
        });

    el.find("#aboutButton").bind('touchstart', function(){
        $("#aboutButton").css("background-color", touchStartColor);
    }).bind('touchend', function(){
            $("#aboutButton").css("background-color", touchEndColor);
        });

    setTimeout( function(){

        var mapOptions = {
            center:pdxLatLng,
            zoom:14,
            mapTypeId:google.maps.MapTypeId.ROADMAP,
            zoomControl: true,
            zoomControlOptions: {
                style: google.maps.ZoomControlStyle.LARGE
            },
            mapTypeControl: false
        };

 		map = new google.maps.Map(document.getElementById("map"), mapOptions);

        infoBubble = new InfoBubble({
            map: map,
            shadowStyle: 1,
            padding: 0,
            backgroundColor: 'rgb(57,57,57)',
            borderRadius:10,
            borderWidth: 1,
            borderColor: 'rgb(57,57,57)',
            disableAutoPan: true,
            hideCloseButton: true,
            backgroundClassName: 'infoBubble'
//           arrowPosition: 30,
//           arrowStyle: 2
//           arrowSize: 10,
        });

        // Listen for user click on map to close any open info bubbles
        google.maps.event.addListener(map, "click", function () {
            infoBubble.close();
        });
    }, 300 );


    setTimeout( function(){
        getArtItems();
    }, 3000 );

    return el;
}


function getValidGalleryIndex (index) {
    index = index + 50;

    if (index > artItems.length) {
        index = artItems.length;
    }
    return index;
}

ViewAssembler.prototype.galleryView = function(startIndex, endIndex, items, showRefreshButton, showMoreImagesButton) {
    var template = templates.galleryViewTemplate;

    var sIndex = getValidGalleryIndex(parseInt(startIndex));
    var eIndex = getValidGalleryIndex(parseInt(endIndex));

    if (sIndex == artItems.length && eIndex == artItems.length ){
        sIndex = 0;
        eIndex = 50;
    }

    var viewModel = {
        startIndex: sIndex,
        endIndex:eIndex
    };

    var el = $( Mustache.to_html(template, viewModel) );

    if (!showRefreshButton){
        el.find( ".galleryButtonBlock").css( "display","none" );
    } else {
        el.find("#refreshButton").bind('touchstart', function(){
            $("#refreshButton").css("background-color", touchStartColor);
        }).bind('touchend', function(){
                $("#refreshButton").css("background-color", touchEndColor);
            });

        el.find("#clearButton").bind('touchstart', function(){
            $("#clearButton").css("background-color", touchStartColor);
        }).bind('touchend', function(){
                $("#clearButton").css("background-color", touchEndColor);
            });
    }

    if (!showMoreImagesButton){
        el.find( ".moreImagesButtonBlock").css( "display","none" );
    } else {
        el.find("#moreImagesButton").bind('touchstart', function(){
            $("#moreImagesButton").css("background-color", touchStartColor);
        }).bind('touchend', function(){
                $("#moreImagesButton").css("background-color", touchEndColor);
            });
    }

    var markupString = '';
    for (var i=parseInt(startIndex); i< parseInt(endIndex); i++) {
        var art = items[i];
        markupString += "<div class='image-frame'><a href='javascript:showArtDetailsFromMapClick(" + art.record_id +");'>" +
                        "<img id='galleryThumbnail' src='" + art.image_url +"'/></a></div>"
    }

    el.find("#galleryWrapper").append(markupString);

    return el;
}

ViewAssembler.prototype.favView = function() {
    var el = $( templates.favViewTemplate );
    return el;
}

ViewAssembler.prototype.artListView = function() {
    var template = templates.artListViewTemplate;

    var result = [];
    for (var i=0; i< artItems.length; i++) {
        var art = artItems[i];
        var artListInfo = [];

        var lat1 = parseFloat(art.lat);
        var lon1 = parseFloat(art.lng);
        var lat2 = parseFloat(currentLat);
        var lon2 = parseFloat(currentLng);

        if (isNaN(lat1) || isNaN(lon1) || isNaN(lat2) || isNaN(lon2)){
            // don't add artListInfo.distance item
        } else {
            artListInfo.distance = Math.round(distance(lat1, lon1, lat2, lon2) * 1000)/1000;
        }
        artListInfo.title = art.title;
        artListInfo.artist = art.artist;
        artListInfo.image = art.image_url;
//        artListInfo.disciplineColor = getDisciplineColor(art.attributes.discipline);
        artListInfo.recordId = art.record_id;
        result.push(artListInfo);
    }

    result.sort( function(a, b){
        if ( a.distance < b.distance) { return -1; }
        else if (a.distance> b.distance ) { return 1; }
        else return 0;
    });

    // get the closest 50 items
    var artNearby = [];
    for (var i=0; i < 50; i++) {
        var art = result[i];
        artNearby.push(art);
    }

    var viewModel = {
        artList: artNearby
    };

    var el = $( Mustache.to_html(template, viewModel) );
    el.find( "li" ).on( this.CLICK_EVENT, onArtListItemClick );
    return el;
}


ViewAssembler.prototype.artDetailView = function(art) {
    var template = templates.artDetailViewTemplate;

/*
    art.attributes.disciplineColor = getDisciplineColor(art.attributes.discipline);
*/

    var el = $( Mustache.to_html(template, art));

    if (art.street == art.location){
        el.find( "#location").css( "display","none");
    }

    el.find("#addToFav").bind('touchstart', function(){
        $("#addToFav").css("background-color", touchStartColor);
    }).bind('touchend', function(){
            $("#addToFav").css("background-color", touchEndColor);
        });

    el.find("#removeFromFav").bind('touchstart', function(){
        $("#removeFromFav").css("background-color", touchStartColor);
    }).bind('touchend', function(){
            $("#removeFromFav").css("background-color", touchEndColor);
        });


    setTimeout( function(){
        var geo = new google.maps.LatLng(art.lat, art.lng);

        var mapOptions = {
            center:geo,
            zoom:15,
            mapTypeId:google.maps.MapTypeId.ROADMAP,
            mapTypeControl: false,
            draggable: false
        };

        var detailMapElement = el.get(0).children[1];
        var artDetailMap = new google.maps.Map(detailMapElement, mapOptions);

        var mapIcon = "assets/graphics/map_icons/" + getDisciplineColor(art.discipline) + ".png";

        var artMarker = new google.maps.Marker({
            map:artDetailMap,
            position:geo,
            icon:mapIcon
        });

        var YourLocation = new google.maps.Marker({
            position:new google.maps.LatLng(currentLat, currentLng),
            map:artDetailMap,
            title: "You are here!"
        });

    }, 300 );

    return el;
}


ViewAssembler.prototype.placeDetailView = function(place) {
    var template = templates.placeDetailViewTemplate;

    var icon = "assets/graphics/map_icons/brown_MarkerG.png";

    for (var j = 0; j < place.types.length; j++) {
        if (place.types[j] == "museum"){
            icon = "assets/graphics/map_icons/yellow_MarkerM.png";
            break;
        }
    }

    place.placeMarkerIcon = icon;

    var el = $( Mustache.to_html(template, place));

    // hide reviews title if no reviews.
    if (place.reviews && place.reviews.length > 0) {
        // no op
    } else  {
        el.find( "#reviewsHeading").css( "display","none");
    }

    el.find("#websiteURL").bind('touchstart', function(){
        $("#websiteURL").css("background-color", touchStartColor);
    }).bind('touchend', function(){
            $("#websiteURL").css("background-color", touchEndColor);
        });

    el.find("#plusPageURL").bind('touchstart', function(){
        $("#plusPageURL").css("background-color", touchStartColor);
    }).bind('touchend', function(){
            $("#plusPageURL").css("background-color", touchEndColor);
        });

    setTimeout( function(){
        var mapOptions = {
            center:place.geometry.location,
            zoom:15,
            mapTypeId:google.maps.MapTypeId.ROADMAP,
            mapTypeControl: false,
            draggable: false
        };

        var detailMapElement = el.get(0).children[1];
        var placeDetailMap = new google.maps.Map(detailMapElement, mapOptions);

        var placeMarker = new google.maps.Marker({
            map:placeDetailMap,
            position:place.geometry.location,
            icon:icon
        });

        var YourLocation = new google.maps.Marker({
            position:new google.maps.LatLng(currentLat, currentLng),
            map:placeDetailMap,
            title: "You are here!"
        });

    }, 300 );

    return el;
}









