function canvas(){
    /*
    var canvasBody = document.getElementById("canvas"),
        canvas = canvasBody.getContext("2d"),

        w = canvasBody.width = window.innerWidth,
        h = canvasBody.height = window.innerHeight,

        pi2 = Math.PI * 2,
        tick = 0,
        opts = {
            canvas: {
                backgroundColor: "rgba(0,0,0,1)"
            },
            point: {
                xSpacing: 75,
                ySpacing: 151,
                speed: 1,

                minRadius: 2,
                addedRadius: 1
            }
        },
        Colors = [
            "rgba(241, 196, 15,1.0)", //yellow
            "rgba(231, 76, 60,1.0)", //red
            "rgba(52, 152, 219,1.0)", //blue
            "rgba(46, 204, 113,1.0)", //green
        ],
        World = function() {
            this.bodies = {};
            this.addBody = function(body) {
                var bodyType = body.name;
                this.bodies[bodyType] ? true : this.bodies[bodyType] = [];
                this.bodies[bodyType].push(body);
            };
            this.update = function() {
                for (key in this.bodies) {
                    this.bodies[key].map(function(Entity) {
                        Entity.update();
                    })
                }
            };
            this.render = function() {
                for (key in this.bodies) {
                    this.bodies[key].map(function(Entity) {
                        Entity.render();
                    })
                }
            };
            this.initBody = function(bodyType) {
                for (var i = 0; i < this.bodies[bodyType].length; i++) {
                    this.bodies[bodyType][i].init();
                }
            };
            this.connect = function() {
                for (key in this.bodies) {
                    for (var i = 0; i < this.bodies[key].length; i++) {
                        for (var j = 0; j < this.bodies[key].length; j++) {
                            var distance = checkDistance(this.bodies[key][i].x, this.bodies[key][i].y, this.bodies[key][j].x, this.bodies[key][j].y),
                                opacity = 1 - distance / opts.point.xSpacing / 2.1;
                            if (opacity > 0) {
                                var gradient = canvas.createLinearGradient(
                                    this.bodies[key][i].x,
                                    this.bodies[key][i].y,
                                    this.bodies[key][j].x,
                                    this.bodies[key][j].y
                                );
                                gradient.addColorStop(0, this.bodies[key][i].color.replace("1.0", opacity));
                                gradient.addColorStop(1, this.bodies[key][j].color.replace("1.0", opacity));
                                canvas.beginPath();
                                canvas.moveTo(this.bodies[key][i].x, this.bodies[key][i].y);
                                canvas.lineTo(this.bodies[key][j].x, this.bodies[key][j].y);
                                canvas.strokeStyle = gradient;
                                canvas.stroke();
                            }
                        }
                    }
                }
            }
        },
        checkDistance = function(x1, y1, x2, y2) {
            return Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2));
        },
        Point = function(obj) {
           // canvas.globalAlpha = 0.1;
            this.name = "point";
            this.x = obj.x;
            this.y = obj.y;
            this.speed = obj.speed;
            this.direction = obj.direction;
            this.radius = opts.point.minRadius + Math.random() * opts.point.addedRadius;
            this.dy = obj.dy || null;
            this.color = Colors[Math.floor(Math.random() * Colors.length)];
            this.init = function() {
                this.dy ? true : this.dy = Math.radians(this.direction ? 90 : -90) * (opts.point.speed);
            };
            this.update = function() {
                this.border();
                this.y += this.dy;
            };
            this.border = function() {
                this.y < 0 + this.radius || this.y > h - this.radius ? this.dy *= -1 : true;
            }
            this.render = function() {
                canvas.beginPath();
                canvas.arc(this.x, this.y, this.radius, 0, pi2);
                canvas.closePath();
                canvas.fillStyle = this.color;
                canvas.shadowColor = this.color;
                canvas.shadowBlur = 20;
                canvas.fill();

                canvas.shadowBlur = 0;
            };
        };

    Math.radians = function(deg) {
        return deg * (Math.PI / 180);
    }
    this.worldInit = function() {
        world = new World();
        for (var i = 0, a = 0; i < w; a++, i += opts.point.xSpacing) {
            for (var j = 0; j < h; j += opts.point.ySpacing) {
                world.addBody(new Point({
                    x: i,
                    y: j + (a % 2 == 0 ? opts.point.minRadius + opts.point.addedRadius + .000001 : 20),
                    speed: opts.point.speed,
                    direction: a % 2 == 0 ? true : false
                }));
            }
        }
        world.initBody("point");
    };
    this.addPoint = function() {
        world.addBody(new Point({
            x: Math.random() * w,
            y: Math.random() * h,
            dy: (Math.random() < 0.5 ? 1 : -1) * opts.point.speed
        }));
    }

    function setup() {
        worldInit()

        var gui = new dat.GUI();
        gui.close();
        gui.add(opts.point, "speed", 0.5, 10);
        gui.add(this, "worldInit").name("reInit");
        gui.add(this, "addPoint").name("addPoint");

        window.requestAnimationFrame(loop);
    };

    function loop() {
        //canvas.fillStyle = opts.canvas.backgroundColor;
        var drawImg = new Image();
        drawImg.src = "img/client_background.png";
        drawImg.onload = function() {
            var imgContext = canvas.createPattern(drawImg,"repeat");
            canvas.rect(0,0,drawImg.width, drawImg.height);
            canvas.fillStyle = imgContext;
            canvas.fill();
        };
        canvas.fillRect(0,0,w,h);

        world.update();
        world.connect();
        world.render();
        window.requestAnimationFrame(loop);
    };
    setup();

    window.addEventListener("resize", function() {
        w = canvasBody.width = window.innerWidth;
        h = canvasBody.height = window.innerHeight;

        this.worldInit();
    });
    canvasBody.addEventListener("mousedown", function(e) {
        world.addBody(new Point({
            x: e.pageX,
            y: e.pageY,
            dy: (Math.random() < 0.5 ? 1 : -1) * opts.point.speed
        }))
    })
    */
}

var CanvasParticle = (function(){
    function getElementByTag(name){
        return document.getElementsByTagName(name);
    }
    function getELementById(id){
        return document.getElementById(id);
    }
    // 根据传入的config初始化画布
    function canvasInit(canvasConfig){
        canvasConfig = canvasConfig || {};
        var html = getElementByTag("html")[0];
        var body = getElementByTag("body")[0];
        var canvasDiv = getELementById("canvas-particle");
        var canvasObj = document.createElement("canvas");

        var canvas = {
            element: canvasObj,
            points : [],
            // 默认配置
            config: {
                vx: canvasConfig.vx || 4,
                vy:  canvasConfig.vy || 4,
                height: canvasConfig.height || 2,
                width: canvasConfig.width || 2,
                count: canvasConfig.count || 100,
                color: canvasConfig.color || "121, 162, 185",
                stroke: canvasConfig.stroke || "130,255,255",
                dist: canvasConfig.dist || 6000,
                e_dist: canvasConfig.e_dist || 20000,
                max_conn: 10
            }
        };

        // 获取context
        if(canvas.element.getContext("2d")){
            canvas.context = canvas.element.getContext("2d");
        }else{
            return null;
        }

        body.style.padding = "0";
        body.style.margin = "0";
        // body.replaceChild(canvas.element, canvasDiv);
        body.appendChild(canvas.element);

        canvas.element.style = "position: absolute; top: 0; left: 0; z-index: -1;";
        canvasSize(canvas.element);
        window.onresize = function(){
            canvasSize(canvas.element);
        };
        body.onmousemove = function(e){
            var event = e || window.event;
            canvas.mouse = {
                x: event.clientX,
                y: event.clientY
            }
        }
        document.onmouseleave = function(){
            canvas.mouse = undefined;
        }
        setInterval(function(){
            drawPoint(canvas);
        }, 40);
    }

    // 设置canvas大小
    function canvasSize(canvas){
        canvas.width = window.innerWeight || document.documentElement.clientWidth || document.body.clientWidth;
        canvas.height = window.innerWeight || document.documentElement.clientHeight || document.body.clientHeight;
    }

    // 画点
    function drawPoint(canvas){
        var context = canvas.context,
            point,
            dist;
        context.clearRect(0, 0, canvas.element.width, canvas.element.height);
        context.beginPath();
        context.fillStyle = "rgb("+ canvas.config.color +")";
        for(var i = 0, len = canvas.config.count; i < len; i++){
            if(canvas.points.length != canvas.config.count){
                // 初始化所有点
                point = {
                    x: Math.floor(Math.random() * canvas.element.width),
                    y: Math.floor(Math.random() * canvas.element.height),
                    vx: canvas.config.vx / 2 - Math.random() * canvas.config.vx,
                    vy: canvas.config.vy / 2 - Math.random() * canvas.config.vy
                }
            }else{
                // 处理球的速度和位置，并且做边界处理
                point =	borderPoint(canvas.points[i], canvas);
            }
            context.fillRect(point.x - canvas.config.width / 2, point.y - canvas.config.height / 2, canvas.config.width, canvas.config.height);

            canvas.points[i] = point;
        }
        drawLine(context, canvas, canvas.mouse);
        context.closePath();
    }

    // 边界处理
    function borderPoint(point, canvas){
        var p = point;
        if(point.x <= 0 || point.x >= canvas.element.width){
            p.vx = -p.vx;
            p.x += p.vx;
        }else if(point.y <= 0 || point.y >= canvas.element.height){
            p.vy = -p.vy;
            p.y += p.vy;
        }else{
            p = {
                x: p.x + p.vx,
                y: p.y + p.vy,
                vx: p.vx,
                vy: p.vy
            }
        }
        return p;
    }

    // 画线
    function drawLine(context, canvas, mouse){
        context = context || canvas.context;
        for(var i = 0, len = canvas.config.count; i < len; i++){
            // 初始化最大连接数
            canvas.points[i].max_conn = 0;
            // point to point
            for(var j = 0; j < len; j++){
                if(i != j){
                    dist = Math.round(canvas.points[i].x - canvas.points[j].x) * Math.round(canvas.points[i].x - canvas.points[j].x) +
                        Math.round(canvas.points[i].y - canvas.points[j].y) * Math.round(canvas.points[i].y - canvas.points[j].y);
                    // 两点距离小于吸附距离，而且小于最大连接数，则画线
                    if(dist <= canvas.config.dist && canvas.points[i].max_conn <canvas.config.max_conn){
                        canvas.points[i].max_conn++;
                        // 距离越远，线条越细，而且越透明
                        context.lineWidth = 0.5 - dist / canvas.config.dist;
                        context.strokeStyle = "rgba("+ canvas.config.stroke + ","+ (1 - dist / canvas.config.dist) +")"
                        context.beginPath();
                        context.moveTo(canvas.points[i].x, canvas.points[i].y);
                        context.lineTo(canvas.points[j].x, canvas.points[j].y);
                        context.stroke();

                    }
                }
            }
            // 如果鼠标进入画布
            // point to mouse
            if(mouse){
                dist = Math.round(canvas.points[i].x - mouse.x) * Math.round(canvas.points[i].x - mouse.x) +
                    Math.round(canvas.points[i].y - mouse.y) * Math.round(canvas.points[i].y - mouse.y);
                // 遇到鼠标吸附距离时加速，直接改变point的x，y值达到加速效果
                if(dist > canvas.config.dist && dist <= canvas.config.e_dist){
                    canvas.points[i].x = canvas.points[i].x + (mouse.x - canvas.points[i].x) / 20;
                    canvas.points[i].y = canvas.points[i].y + (mouse.y - canvas.points[i].y) / 20;
                }
                if(dist <= canvas.config.e_dist){
                    context.lineWidth = 1;
                    context.strokeStyle = "rgba("+ canvas.config.stroke + ","+ (1 - dist / canvas.config.e_dist) +")";
                    context.beginPath();
                    context.moveTo(canvas.points[i].x, canvas.points[i].y);
                    context.lineTo(mouse.x, mouse.y);
                    context.stroke();
                }
            }
        }
    }
    return canvasInit;
})();