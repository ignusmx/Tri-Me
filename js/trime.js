"use strict";

var options = {
    type: "YAPE06",
    fastThreshold: 16,
    laplacianThreshold: 89,
    eigenThreshold: 75,
    hueShift: 0,
    invertLightness: false,
    invertSaturation: false,
    showVideo: false,
    saveImage: function () { saveImage() }
}

//

var gui, imageData;
var img_u8, count, corners;
var featureContext, triangleContext, textContext;

var video = document.getElementById('webcam');
var featureCanvas = document.getElementById('features');
var triangleCanvas = document.getElementById('triangles');
var handCanvas = document.getElementById('hand');
var model = null;
var isVideo = false;
var currentPredictions = [];
var radius = 0;
var centerX = 0;
var centerY = 0;
var mainPrediction = null;
var currentTriggerTime = 0;
var triggerTime = 5;
var triggering = false;
var triggered = false;
var leftHandPos = {x:0,y:0};
var rightHandPost = {x:0,y:0};
var scaledLeftHandPos = {x:0,y:0};
var scaledRightHandPost = {x:0,y:0};
var collisionButton = null;
var preselectedButton = null;
var selectTimeout = null;
var handRGB = [1,.7,0];

var slideTransitionInterval = null;
var slides = [
    {strings:[
        "USA TUS MANOS PARA INTERACTUAR"
        ],
    buttons : [{text:"SERVICIOS", slide:1}, {text:"CASOS DE ÉXITO", slide:2}],
    rgb:[.7,0,1]},
    {strings:[
        "SERVICIOS"
    ], 
    buttons : [
        {text:"INNOVACIÓN", slide:2}, 
        {text:"TECNOLOGÍA", slide:3}, 
        {text:"ARTE Y DISEÑO", slide:4},
        {text:"REGRESAR", slide:0}],
    rgb:[0,.7,1]},
    {strings:[
        `INNOVACIÓN
        <br> - TRANSFORMACIÓN DIGITAL 
        <br> - DATA SCIENCE + INTELIGENCIA DE NEGOCIOS
        <br> - VIDEOJUEGOS Y EXPERIENCIAS INTERACTIVAS`
    ],
    buttons : [{text:"REGRESAR", slide:1}],
    rgb:[0,.7,1]},
    {strings:[
        `TECNOLOGÍA 
        <br> - DESARROLLO DE SOFTWARE A LA MEDIDA 
        <br> - SITIOS WEB + E-COMMERCE
        <br> - CRM Y ERP
        <br> - SOFTWARE PARA LA CONSTRUCCIÓN, <br> AGRO Y GEOLOCALIZACIÓN`
    ],
    buttons : [{text:"REGRESAR", slide:1}], 
    rgb:[.7,0,1]},
    {strings:[
        `ARTE Y DISEÑO
        <br> - DISEÑO DE MARCA E IDENTIDAD
        <br> - MARKETING DIGITAL
        <br> - DISEÑO GRÁFICO + UI/UX`
    ],
    buttons : [{text:"REGRESAR", slide:1}],
    rgb:[.7,0,0]}
];
var currentSlideIndex = 0;

//

const modelParams = {
    flipHorizontal: true,   // flip e.g for video  
    maxNumBoxes: 4,        // maximum number of boxes to detect
    iouThreshold: 0.5,      // ioU threshold for non-max suppression
    scoreThreshold: 0.6,    // confidence threshold for predictions.
}

/*var typed = new Typed('.typed', {
    strings: [""],
    typeSpeed: 1,
    backSpeed: 1,
    showCursor:false
});*/

//typed.stop();

function setupButtons()
{
    $("#buttonsContainer").html("");
    var buttons = slides[currentSlideIndex].buttons;
    if(buttons != null)
    {
        for(var i = 0; i < buttons.length; i++)
        {
            $("#buttonsContainer").append('<div class="handButton">'+buttons[i].text+'</div>');
            var buttonElt = $("#buttonsContainer .handButton").last();
            buttons[i].elt = buttonElt;
        }
        for(var i = 0; i < buttons.length; i++)
        {
            var pos = buttons[i].elt.offset();
            buttons[i].pos = {x:pos.left+buttons[i].elt.width()/2, y:pos.top+buttons[i].elt.height()/2};
            //$("body").append('<div style="color:white; position:absolute; left:'+buttons[i].pos.x+'px; top:'+buttons[i].pos.y+'px;">A</div>');
            buttons[i].scaledPos = convertPointToScreenScale(buttons[i].pos);
        }

        
        
        $(".handButton").fadeTo(2000, 1);
    }
}

function goToSlide(slide){
    
    triggered = false;
    radius = 0;
    if(slideTransitionInterval != null)
    {
        clearInterval(slideTransitionInterval);
    }

    currentSlideIndex = slide;
    $("#text").html(slides[currentSlideIndex].strings[0]);
    $("#text").fadeTo(2000, 1);
    /*typed.strings = slides[currentSlideIndex].strings;
    typed.reset();
    typed.start();*/
    setupButtons();

    requestAnimationFrame(runDetection);
}

function startVideo() {
    handTrack.startVideo(video).then(function (status) {
        console.log("video started", status);
        if (status) {
            console.log("Video started. Now tracking");
            isVideo = true
            runDetection()
        } else {
            console.log("Please enable video");
        }
    });
}

function testHandCollision(point, handBB)
{
    if(
        (point.x >= handBB[0] && point.x <= handBB[0]+handBB[2])
        && (point.y >= handBB[1] && point.y <= handBB[1]+handBB[3])
        )
    {
        return true;
    }
    
    return false;
}

function runDetection() {
    model.detect(video).then(predictions => {
        currentPredictions = predictions;
        mainPrediction = null;
        

        if(!triggered && predictions.length > 0 
            && currentSlideIndex >= 0 
            && slides[currentSlideIndex] != null
            && slides[currentSlideIndex].buttons != null
            && slides[currentSlideIndex].buttons.length > 0){
            mainPrediction = currentPredictions[0];
            collisionButton = null;

            for(var i = 0; i < currentPredictions.length; i++)
            {
                for(var j = 0; j < slides[currentSlideIndex].buttons.length; j++)
                {
                    if(collisionButton == null 
                        && testHandCollision(slides[currentSlideIndex].buttons[j].scaledPos, currentPredictions[i].bbox))
                    {
                        collisionButton = slides[currentSlideIndex].buttons[j];
                        if(selectTimeout != null)
                        {
                            //clearTimeout(selectTimeout);
                        }
                    }
                }
            }

            if(collisionButton != null && selectTimeout == null)
            {
                //console.log("asdddd");
                selectTimeout = 
                setTimeout(function() {
                    if(collisionButton != null)
                    {
                        selectTimeout = null;
                        triggered = true;
                        centerX = collisionButton.scaledPos.x;
                        centerY = collisionButton.scaledPos.y;
                        collisionButton.elt.addClass("touchedButton");
                    }
                }, 3000);
            }
            /*if(!triggering)
            {
                triggering = true;
                trigger();
            }*/
        }

        if(triggered)
        {
            $("#leftHand").fadeTo(2000, 0);
            $("#rightHand").fadeTo(2000, 0);
            $("#text").fadeTo(2000, 0);
            //model.dispose();
            currentPredictions = [];
            //video.pause();
            if(slideTransitionInterval != null)
            {
                clearInterval(slideTransitionInterval);
            }
                slideTransitionInterval = setInterval(() => {
                    //console.log("interval");
                    radius += 50;
                    if(radius > 500)
                    {
                        
                        goToSlide(collisionButton.slide);
                    }
                }, 200);
        }
        else
        {
            requestAnimationFrame(runDetection);
        }
    });
}

function startExperience()
{
    featureContext = featureCanvas.getContext('2d');
    triangleContext = triangleCanvas.getContext('2d');

    img_u8 = new jsfeat.matrix_t(640, 480, jsfeat.U8_t | jsfeat.C1_t);

    corners = [];
    var i = 640 * 480;
    while (--i >= 0) corners[i] = new jsfeat.point2d_t(0, 0, 0, 0);

    setupControls();

    requestAnimationFrame(animate);
    
    $(window).bind('resize', resize);
    resize();
}

function getRandomNumber(min, max) {
    return Math.random() * (max - min) + min;
}

function convertPointToScreenScale(point)
{
    return {x:point.x*640/$(window).width(), y:point.y*480/$(window).height()};
}

function init() {
    video.play();
    $("#loading").fadeTo(2000, 1);

    handTrack.load(modelParams).then(lmodel => {
        // detect objects in the image.
        model = lmodel;
        //startVideo();
        $("#loading").fadeTo(2000, 0);
        goToSlide(0);
        runDetection();
        startExperience();
    });
}

//

function setupControls() {
    gui = new dat.GUI();
    var folder;

    folder = gui.addFolder("Feature Detection");
    folder.add(options, "type", ["Fast", "YAPE", "YAPE06"]);
    folder.open();

    folder = gui.addFolder("YAPE06 Settings");
    folder.add(options, "laplacianThreshold", 1, 100);
    folder.add(options, "eigenThreshold", 1, 100);

    folder = gui.addFolder("Fast Settings");
    folder.add(options, "fastThreshold", 5, 20);

    gui.add(options, "hueShift", 0, 360);
    gui.add(options, "invertSaturation");
    gui.add(options, "invertLightness");

    gui.add(options, "showVideo").onChange(function () {
        if (options.showVideo)
            $("#features").show();
        else
            $("#features").hide();
    });

    gui.add(options, "saveImage");

    gui.close();
}

//


function animate() {
    requestAnimationFrame(animate);
    if (video.readyState === video.HAVE_ENOUGH_DATA) {
        featureContext.translate(640, 0);
        featureContext.scale(-1, 1);
        featureContext.drawImage(video, 0, 0, 640, 480);
        let imgData = featureContext.getImageData(0, 0, featureContext.canvas.width, featureContext.canvas.height);
        let pixels = imgData.data;
        /*for (var i = 0; i < pixels.length; i += 4) {

            let lightness = parseInt((pixels[i] + pixels[i + 1] + pixels[i + 2]) / 3);

            pixels[i] = lightness;
            pixels[i + 1] = lightness;
            pixels[i + 2] = lightness;
        }
        featureContext.putImageData(imgData, 0, 0);*/
        
        /*for(var i = 0; i < currentPredictions.length; i++)
        {
            let handBBox = currentPredictions[i].bbox;
            var gradient = featureContext.createLinearGradient(0,0, 640,0);
            featureContext.globalCompositeOperation = 'source-over';
            // Add three color stops
            gradient.addColorStop(0,'rgba(28,18,161,0.2)');
            gradient.addColorStop(0.4,'rgba(28,18,161,0.2)');
            gradient.addColorStop(1, 'rgba(226,255,0,0.2)');

            // Set the fill style and draw a rectangle
            featureContext.fillStyle = gradient;
            featureContext.fillRect(handBBox[0], handBBox[1], handBBox[2], handBBox[3]);
        }*/
        
        imageData = featureContext.getImageData(0, 0, 640, 480);
        jsfeat.imgproc.grayscale(imageData.data, img_u8.data);

        

        //

        if (options.type == "YAPE06") {
            jsfeat.yape06.laplacian_threshold = options.laplacianThreshold;
            jsfeat.yape06.min_eigen_value_threshold = options.eigenThreshold;
            count = jsfeat.yape06.detect(img_u8, corners);
        } else if (options.type == "YAPE") {
            jsfeat.yape.init(featureCanvas.width, featureCanvas.height, 5, 1);
            count = jsfeat.yape.detect(img_u8, corners, 5);
        } else {
            jsfeat.fast_corners.set_threshold(options.fastThreshold);
            count = jsfeat.fast_corners.detect(img_u8, corners, 5);
        }

        //

        var featureData = featureContext.createImageData(imageData.width, imageData.height);
        featureData.data.set(imageData.data);

        var data_u32 = new Uint32Array(featureData.data.buffer);
        drawCorners(corners, count, data_u32, 640);
        featureContext.putImageData(featureData, 0, 0);

        //

        drawTriangles();
    }
}

//

function drawTriangles() {

    var triangleCanvas = document.getElementById("triangles"),
        triangleContext = triangleCanvas.getContext("2d")
        triangleContext.clearRect(0, 0, triangleCanvas.width, triangleCanvas.height);
        featureContext.translate(640, 0);
        featureContext.scale(-1, 1);
        triangleContext.drawImage(video, 0, 0, 640, 480);

    var vertices = new Array(count + 4);

    var i;
    for (i = 0; i < count; i++)
        vertices[i] = { x: corners[i].x, y: corners[i].y };

    vertices[i++] = { x: 0, y: 0 };
    vertices[i++] = { x: triangleCanvas.width, y: 0 };
    vertices[i++] = { x: triangleCanvas.width, y: triangleCanvas.height };
    vertices[i++] = { x: 0, y: triangleCanvas.height };

    var triangles = triangulate(vertices)

    var i = triangles.length;
    
    while (i) {
        --i;
        var centroid = triangles[i].centroid();
        var pixel = (centroid.y * triangleCanvas.width + centroid.x) * 4;
        
        //greyscale
        /*var grey = 0.2126 * imageData.data[pixel] + 0.7152 * imageData.data[pixel + 1] + 0.0722 * imageData.data[pixel + 2];
        imageData.data[pixel] = 0;
        imageData.data[pixel + 1] = 0;
        imageData.data[pixel + 2] = 0;*/

        var grey = 0.2126 * imageData.data[pixel] + 0.7152 * imageData.data[pixel + 1] + 0.0722 * imageData.data[pixel + 2];
        imageData.data[pixel] = grey * slides[currentSlideIndex].rgb[0];
        imageData.data[pixel + 1] = grey * slides[currentSlideIndex].rgb[1];
        imageData.data[pixel + 2] = grey * slides[currentSlideIndex].rgb[2];

        for(var predictionIndex = 0; predictionIndex < currentPredictions.length; predictionIndex++)
        {
            let handBBox = currentPredictions[predictionIndex].bbox;
            if(centroid.x >= handBBox[0] 
                && centroid.y >= handBBox[1]
                && centroid.x <= handBBox[0]+handBBox[2] 
                && centroid.y <= handBBox[1]+handBBox[3])
            {
                //console.log(radius);
                
                imageData.data[pixel] = grey * handRGB[0];
                imageData.data[pixel + 1] = grey * handRGB[1];
                imageData.data[pixel + 2] = grey * handRGB[2];
            }
        }

        if(triggered){
            //console.log(radius);
            //console.log(centerX);
            var distX = centerX - triangles[i].centroid().x;
            var distY = centerY - triangles[i].centroid().y;
            var distance = Math.sqrt( (distX*distX) + (distY*distY) );
            
            if(distance <= radius){
                imageData.data[pixel] = grey * slides[collisionButton.slide].rgb[0];
                imageData.data[pixel + 1] = grey * slides[collisionButton.slide].rgb[1];
                imageData.data[pixel + 2] = grey * slides[collisionButton.slide].rgb[2];
            }
        }

        var r = imageData.data[pixel];
        var g = imageData.data[pixel + 1];
        var b = imageData.data[pixel + 2];

        var hsv = rgb2hsl(r, g, b);

        if (options.invertSaturation) hsv.s = 1 - hsv.s;
        if (options.invertLightness) hsv.l = 1 - hsv.l;

        triangleContext.fillStyle = 'hsl(' + (((hsv.h * 360) + options.hueShift) % 360) + ',' + hsv.s * 100 + '%,' + hsv.l * 100 + '%)';

        triangles[i].draw(triangleContext)
        triangleContext.fill();
    }
}

//

function drawCorners(corners, count, img, step) {
    var pix = (0xff << 24) | (0x00 << 16) | (0xff << 8) | 0x00;
    for (var i = 0; i < count; ++i) {
        var x = corners[i].x;
        var y = corners[i].y;
        var off = (x + y * step);
        img[off] = pix;
        img[off - 1] = pix;
        img[off + 1] = pix;
        img[off - step] = pix;
        img[off + step] = pix;
    }

}

// 

function resize(event) {

    //console.log($("#container").width());

    var newWidth = $("#container").width();
    var newHeight = $("#container").width() / triangleCanvas.width * triangleCanvas.height;

    if (newHeight < $("#container").height()) {
        newHeight = $("#container").height();
        newWidth = $("#container").height() / triangleCanvas.height * triangleCanvas.width;
    }

    $("#triangles").width(newWidth);
    $("#triangles").height(newHeight);

    $("#triangles").css('left', $("#container").width() / 2 - newWidth / 2);
    $("#triangles").css('top', $("#container").height() / 2 - newHeight / 2);

}

//

function saveImage() {
    triangleCanvas.toBlob(function (blob) {
        saveAs(blob, "trime.png");
    }, "image/png");
}

// http://mjijackson.com/2008/02/rgb-to-hsl-and-rgb-to-hsv-color-model-conversion-algorithms-in-javascript

function rgb2hsl(r, g, b) {
    r /= 255, g /= 255, b /= 255;
    var max = Math.max(r, g, b), min = Math.min(r, g, b);
    var h, s, l = (max + min) / 2;

    if (max == min) {
        h = s = 0; // achromatic
    } else {
        var d = max - min;
        s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
        switch (max) {
            case r: h = (g - b) / d + (g < b ? 6 : 0); break;
            case g: h = (b - r) / d + 2; break;
            case b: h = (r - g) / d + 4; break;
        }
        h /= 6;
    }

    return { h: h, s: s, l: l };
}