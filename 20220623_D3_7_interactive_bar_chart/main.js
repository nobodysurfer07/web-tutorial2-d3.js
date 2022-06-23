//Data utilities
//遇到NA就設定為undefined, 要不然就維持原本的字串
const parseNA = string => (string === 'NA' ? undefined : string);
//日期處理
const parseDate = string => d3.timeParse('%Y-%m-%d')(string);

d3.csv('data/movies.csv').then(
    res => {
        console.log(res);
    }
)


function type(d){
    const date = parseDate(d.release_date);
    return{
        // "+" string -> numeric
        // parseNA 去除空值
        budget: +d.budget,
        genre: parseNA(d.genre),
        genres: JSON.parse(d.genres).map(d=>d.name),
        homepage: parseNA(d.homepage),
        id: +d.id,
        imdb_id: parseNA(d.imdb_id),
        original_language: parseNA(d.original_language),
        overview: parseNA(d.overview),
        popularity: +d.popularity,
        poster_path: parseNA(d.poster_path),
        production_countries: JSON.parse(d.production_countries),
        release_date: date,
        release_year: date.getFullYear(),
        revenue: +d.revenue,
        runtime: +d.runtime,
        tagline: parseNA(d.tagline),
        title: parseNA(d.title),
        vote_average: +d.vote_average,
        vote_count: +d.vote_count
    }
}

function filter_data(data){
    return data.filter(
        d => {
            return(
                d.release_year > 1999 && d.release_year < 2010 &&
                d.revenue > 0 &&
                d.budget > 0 &&
                d.genre && d.title
            );
        }
    );
}

function prepare_bar_chart_data(data){
    console.log(data);
    const data_map = d3.rollup(
        data,
        v => d3.sum(v, leaf => leaf.revenue),    // 將revenue加總
        d => d.genre    // groupby 電影
    );
    const data_array = Array.from(data_map, d => ({genre:d[0], revenue:d[1]}));
    // [...dataMap][0][0]
    // [...dataMap][0][1]
    return data_array;
}

function format_ticks(d){
    return d3.format('~s')(d).replace('M','mil').replace('G','bil').replace('T','tri')
}


function setup_canvas(bar_char_data, movie_clean){

    // default -> revenue
    let metric = 'revenue';

    function click(){
        metric = this.dataset.name;
        const this_data = choose_data(metric, movie_clean);
        update(this_data);
    }

    d3.selectAll('button').on('click', click);

    function update(data){
        console.log(data);
        // update scale
        x_max = d3.max(data, d => d[metric]);
        x_scale_v3 = d3.scaleLinear([0, x_max], [0, chart_width])

        y_scale = d3.scaleBand()
                    .domain(data.map(d => d.title))
                    .rangeRound([0, chart_height])
                    .paddingInner(0.25);
        
        // Transition Settings
        const default_delay = 1000
        const transition_delay = d3.transition().duration(default_delay);

        // Update axis
        x_axis_draw.transition(transition_delay).call(x_axis.scale(x_scale_v3));
        y_axis_draw.transition(transition_delay).call(y_axis.scale(y_scale));

        // Update Header
        header.select('tspan').text(`Top 15 ${metric} movies ${metric === 'popularity' ? '' : 'in US'}`);

        // Update Bar
        bars.selectAll('.bar').data(data, d => d.title).join(
            enter => {
                enter.append('rect')
                    .attr('class', 'bar')
                    .attr('x', 0)
                    .attr('y',d=>y_scale(d.title))
                    .attr('height', y_scale.bandwidth())
                    .style('fill', 'lightcyan')
                    .transition(transition_delay)
                    .delay((d, i) => i*20)
                    .attr('width', d => x_scale_v3(d[metric]))
                    .style('fill', 'dodgerblue')
            },
            update => {
                update.transition(transition_delay)
                    .delay((d, i) => i*20)
                    .attr('y', d => y_scale(d.title))
                    .attr('width', d => x_scale_v3(d[metric]))
            },
            exit => {
                exit.transition()
                    .duration(default_delay / 2)
                    .style('fill-opacity', 0)
                    .remove()
            }
        );
        d3.selectAll('.bar')
            .on('mouseover',mouseover)
            .on('mousemove',mousemove)
            .on('mouseout',mouseout);


    }


    const svg_width = 700;
    const svg_height = 500;
    const chart_margin = {top:80, right:80, bottom:40, left:250};
    const chart_width = svg_width - (chart_margin.left + chart_margin.right);
    const chart_height = svg_height - (chart_margin.top + chart_margin.bottom);
    
    const this_svg = d3.select('.bar-chart-container')
                        .append('svg')
                        .attr('width', svg_width)
                        .attr('height',svg_height)
                        .append('g')
                        .attr('transform', `translate(${chart_margin.left}, ${chart_margin.top})`);
    
    //scale
    //v1.d3.extent find min & max in revenue
    const x_extent = d3.extent(bar_char_data, d => d.revenue);
    const x_scale_v1 = d3.scaleLinear().domain(x_extent).range([0, chart_width]);

    //v2 : 0 -> max
    let x_max = d3.max(bar_char_data, d => d.revenue);
    const x_scale_v2 = d3.scaleLinear().domain([0, x_max]).range([0, chart_width]);
    
    //v3.Short writing for v2
    let x_scale_v3 = d3.scaleLinear([0, x_max],[0, chart_width]);
    //垂直空間的分配- 平均分布給各種類
    let y_scale = d3.scaleBand()
                    .domain(bar_char_data.map(d=>d.genre))
                    .rangeRound([0, chart_height])
                    .paddingInner(0.25);
    
    //Draw bars
    const bars = this_svg.append('g').attr('class', 'bars');
    // const bars = this_svg.selectAll('.bar')
    //                     .data(bar_char_data)
    //                     .enter()
    //                     .append('rect')
    //                     .attr('class', 'bar')
    //                     .attr('x', 0)
    //                     .attr('y', d=>y_scale(d.genre))
    //                     .attr('width', d=>x_scale_v3(d.revenue))
    //                     .attr('height', y_scale.bandwidth())
    //                     .style('fill', 'dodgerblue')
    


    //Draw header
    let header = this_svg.append('g')
                        .attr('class','bar-header')
                        .attr('transform',`translate(0,${-chart_margin.top / 2})`)
                        .append('text');

    header.append('tspan')
        .text('Top 15 XXX movies');
    
    header.append('tspan')
        .text('Years:2000-2009')
        .attr('x',0)
        .attr('y',20)
        .style('font-size','0.8em')
        .style('fill','#555');

    let x_axis = d3.axisTop(x_scale_v3)
                .ticks(5)
                .tickFormat(format_ticks)
                .tickSizeInner(-chart_height)
                .tickSizeOuter(0);

    let x_axis_draw = this_svg.append('g')
                            .attr('class','x axis')
                            // .call(x_axis);

    let y_axis = d3.axisLeft(y_scale).tickSize(0);

    let y_axis_draw = this_svg.append('g')
                    .attr('class','y axis')
                    // .call(y_axis);

    y_axis_draw.selectAll('text').attr('dx','-0.6em');  
    
    update(bar_char_data);
    
    const tip = d3.select('.tooltip');

    function mouseover(e){
        // get data
        const this_bar_data = d3.select(this).data()[0];
        // debugger;
        

        const body_data = [
            ['Budget', this_bar_data.budget],
            ['Revenue', this_bar_data.revenue],
            ['Profit', this_bar_data.revenue - this_bar_data.budget],
            ['TMDB Popularity', Math.round(this_bar_data.popularity)],
            ['IMDB Rating', this_bar_data.vote_average],
            ['Genres', this_bar_data.genres.join(', ')]
        ];

        tip.style('left', (e.clientX + 15) + 'px')
            .style('top', e.clientY + 'px')
            .style('opacity', 0.98)

        tip.select('h3').html(`${this_bar_data.title}, ${this_bar_data.release_year}`);
        tip.select('h4').html(`${this_bar_data.tagline}, ${this_bar_data.runtime} min.`);
        
        d3.select('.tip-body')
            .selectAll('p')
            .data(body_data)
            .join('p')
            .attr('class', 'tip-info')
            .html(d => `${d[0]} : ${d[1]}`);

    }


    function mousemove(e){
        tip.style('left', (e.client_x + 15) + 'px')
            .style('top', e.client_y + 'px');
    }
    

    function mouseout(e){
        tip.style('opacity',0)
    }
    //interactive 新增監聽
    d3.selectAll('.bar')
    .on('mouseover',mouseover)
    .on('mousemove',mousemove)
    .on('mouseout',mouseout);
        
}


// main
function ready(movies){
    const movie_clean = filter_data(movies);

    // get top 15 revenue movies
    const revenue_data = choose_data("revenue", movie_clean)
    setup_canvas(revenue_data, movie_clean)
}


function choose_data(metric, movie_clean){
    const this_data = movie_clean.sort((a, b) => b[metric] - a[metric]).filter((d, i) => i < 15);
    return this_data;
}


d3.csv('data/movies.csv', type).then(
    res => {
        ready(res);
    // console.log(res);
    }
)