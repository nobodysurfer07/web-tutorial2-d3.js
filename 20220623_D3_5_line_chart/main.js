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

function prepare_line_chart_data(data){
    // 取得發行年分
    const group_by_year = d => d.release_year;
    // 只取出revenue加總
    const sum_of_revenue = values => d3.sum(values, d => d.revenue);
    // 依年份加總revenue
    const sum_of_revenue_by_year = d3.rollup(data, sum_of_revenue, group_by_year);
    // 只取出budget加總
    const sum_of_budget = values => d3.sum(values, d => d.budget);
    // 依年份加總budget
    const sum_of_budget_by_year = d3.rollup(data, sum_of_budget, group_by_year);
    // 放進array排序
    const revenue_array = Array.from(sum_of_revenue_by_year).sort((a, b) => a[0] - b[0]);
    const budget_array = Array.from(sum_of_budget_by_year).sort((a, b) => a[0] - b[0]);
    // 用年份產生日期時間格式的資料 -> 後續繪圖的x軸
    const parse_year = d3.timeParse('%Y');
    const dates = revenue_array.map(d => parse_year(d[0]));
    // 找出最大值(把各年份的revenue與各年份的budget放一起)
    const revenue_budget_array = revenue_array.map(d => d[1]).concat(budget_array.map(d => d[1]));
    const y_max = d3.max(revenue_budget_array);

    // 最終回傳
    const line_data = {
        series:[
            {
                name:'Revenue',
                color:'dodgerblue',
                values:revenue_array.map(d => ({date:parse_year(d[0]), value:d[1]}))
            },
            {
                name:'Budget',
                color:'darkorange',
                values:budget_array.map(d => ({date:parse_year(d[0]), value:d[1]}))
            }
        ],
        dates:dates,
        y_max:y_max
    }
    return line_data;
}


function format_ticks(d){
    return d3.format('~s')(d).replace('M','mil').replace('G','bil').replace('T','tri')
}


function add_label(axis, label, x, y){
    axis.selectAll('.tick:last-of-type text')
        .clone()
        .text(label)
        .attr('x', x)
        .attr('y', y)
        .style('text-anchor', 'start')
        .style('font-weight', 'bold')
        .style('fill', '#555');
}

function setup_canvas(line_chart_data){
    // 500 x 500
    const svg_width = 500;
    const svg_height = 500;
    const chart_margin = {top:80, right:60, bottom:40, left:80};
    const chart_width = svg_width - (chart_margin.left + chart_margin.right);
    const chart_height = svg_height - (chart_margin.top + chart_margin.bottom);
    
    // Draw line chart Base
    const this_svg = d3.select('.line-chart-container')
                        .append('svg')
                        .attr('width', svg_width)
                        .attr('height', svg_height)
                        .append('g')
                        .attr('transform', `translate(${chart_margin.left}, ${chart_margin.top})`);
    // scale
    // x軸 -> 時間
    const x_extent = d3.extent(line_chart_data.dates);
    const x_scale = d3.scaleTime().domain(x_extent).range([0, chart_width]);

    // 垂直空間的分配 - 平均分布給各種類
    // 最小放最下方，與座標相反
    const y_scale = d3.scaleLinear().domain([0, line_chart_data.y_max]).range([chart_height, 0]);

    // line generator
    const line_generator = d3.line()
                            .x(d => x_scale(d.date))
                            .y(d => y_scale(d.value));

    // Draw Line
    const chart_group = this_svg.append('g').attr('class', 'line-chart-container');

    chart_group.selectAll('.line_series')
                .data(line_chart_data.series)
                .enter()
                .append('path')
                .attr('class', d => `line-series ${d.name.toLowerCase()}`)
                .attr('d', d => line_generator(d.values))
                .style('fill', 'none')
                .style('stroke', d => d.color);

    // Draw X-axis
    const x_axis = d3.axisBottom(x_scale).tickSizeOuter(0);
    this_svg.append('g')
            .attr('class', 'x axis')
            .attr('transform', `translate(0, ${chart_height})`)
            .call(x_axis);
    // Draw Y-axis
    const y_axis = d3.axisLeft(y_scale)
                    .ticks(5)
                    .tickFormat(format_ticks)
                    .tickSizeInner(-chart_height)
                    .tickSizeOuter(0);
    this_svg.append('g')
            .attr('class', 'y axis')
            .call(y_axis);


    // Draw Series Label
    // 放在最後一個點的旁邊 (x+5, y不變)
    chart_group.append('g')
                .attr('class', 'series-labels')
                .selectAll('.series-label')
                .data(line_chart_data.series)
                .enter()
                .append('text')
                .attr('x', d => x_scale(d.values[d.values.length - 1].date) + 5)
                .attr('y', d => y_scale(d.values[d.values.length - 1].value))
                .text(d => d.name)
                .style('dominant-baseline', 'central')
                .style('font-size', '0.7em')
                .style('font-weight', 'bold')
                .style('fill', d => d.color);

    //Draw header
    const header = this_svg.append('g')
                        .attr('class','line-header')
                        .attr('transform',`translate(0, ${-chart_margin.top/2})`)
                        .append('text');
    header.append('tspan').text('Budget & Revenue over time in $US');
    header.append('tspan')
        .text('Films w/ budget and revenue figures, 2000-2009')
        .attr('x',0)
        .attr('y',20)
        .style('font-size','0.8em')
        .style('fill','#555');  
}


function ready(movies){
    const movie_clean = filter_data(movies);
    const line_chart_data = prepare_line_chart_data(movie_clean);   
    console.log(line_chart_data);
    // 畫圖
    setup_canvas(line_chart_data);
}

d3.csv('data/movies.csv',type).then(
    res => {
        ready(res);
    // console.log(res);
    }
)