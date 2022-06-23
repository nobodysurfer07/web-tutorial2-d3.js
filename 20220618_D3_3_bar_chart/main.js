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

function setup_canvas(bar_char_data){
    const svg_width = 400;
    const svg_height = 500;
    const chart_margin = {top:80, right:40, bottom:40, left:80};
    const chart_width = svg_width - (chart_margin.left + chart_margin.right);
    const chart_height = svg_height - (chart_margin.top + chart_margin.bottom);
    const this_svg = d3.select('.bar-chart-container')
                        .append('svg')
                        .attr('width', svg_width)
                        .attr('height',svg_height)
                        .append('g')
                        .attr('transform', `translate(${chart_margin.left}, ${chart_margin.top})`);
    //scale
    //V1 : min -> max
    const x_extent = d3.extent(bar_char_data, d=>d.revenue);
    const x_scale_v1 = d3.scaleLinear().domain(x_extent).range([0,chart_width]);
    // range : 實際要放東西的地方
    // domian : 資料
    //V2 : 0 -> max
    const x_max = d3.max(bar_char_data, d=>d.revenue);
    const x_scale_v2 = d3.scaleLinear().domain([0, x_max]).range([0,chart_width]);
    //V3.Short writing for v2
    const x_scale_v3 = d3.scaleLinear([0, x_max],[0, chart_width]);
    //垂直空間的分配- 平均分布給各種類
    const y_scale = d3.scaleBand()
                    .domain(bar_char_data.map(d=>d.genre))
                    .rangeRound([0, chart_height])
                    .paddingInner(0.25);
    //Draw bars
    // 出現/更新/消失
    const bars = this_svg.selectAll('.bar')
                        .data(bar_char_data)
                        .enter()
                        .append('rect')
                        .attr('class', 'bar')
                        .attr('x', 0)
                        .attr('y', d=>y_scale(d.genre))
                        .attr('width', d=>x_scale_v3(d.revenue))
                        .attr('height', y_scale.bandwidth())
                        .style('fill', 'dodgerblue')
    //Draw header
    const header = this_svg.append('g').attr('class','bar-header')
                    .attr('transform',`translate(0,${-chart_margin.top/2})`)
                    .append('text');
    header.append('tspan').text('Total revenue by genre in $US');
    header.append('tspan')
        .text('Years:2000-2009')
        .attr('x',0)
        .attr('y',20)
        .style('font-size','0.8em')
        .style('fill','#555');

    const x_axis = d3.axisTop(x_scale_v3)
                .tickFormat(format_ticks)
                .tickSizeInner(-chart_height)
                .tickSizeOuter(0);
    const x_axis_draw = this_svg.append('g')
                            .attr('class','x axis')
                            .call(x_axis);
    const y_axis = d3.axisLeft(y_scale).tickSize(0);
    const y_axis_draw = this_svg.append('g')
                    .attr('class','y axis')
                    .call(y_axis);
    y_axis_draw.selectAll('text').attr('dx','-0.6em');    
    
}

function ready(movies){
    const movies_clean = filter_data(movies);
    const bar_char_data = prepare_bar_chart_data(movies_clean).sort(
        (a, b) => {
            return d3.descending(a.revenue, b.revenue);
        }
    )
        
    console.log(bar_char_data);
    // 畫圖
    setup_canvas(bar_char_data);
}

d3.csv('data/movies.csv',type).then(
    res => {
        ready(res);
    // console.log(res);
    }
)