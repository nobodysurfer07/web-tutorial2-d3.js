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

function prepare_scatter_data(data){
    return data.sort((a, b) => b.budget - a.budget).filter((d, i) => i < 100);
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

function setup_canvas(scatter_data){
    // 500 x 500
    const svg_width = 500;
    const svg_height = 500;
    const chart_margin = {top:80, right:40, bottom:40, left:80};
    const chart_width = svg_width - (chart_margin.left + chart_margin.right);
    const chart_height = svg_height - (chart_margin.top + chart_margin.bottom);
    
    // Draw Scatter Base
    const this_svg = d3.select('.scatter-plot-container')
                        .append('svg')
                        .attr('width', svg_width)
                        .attr('height', svg_height)
                        .append('g')
                        .attr('transform', `translate(${chart_margin.left}, ${chart_margin.top})`);
    //scale
    //d3.extent find min & max in budget
    const x_extent = d3.extent(scatter_data, d => d.budget);
    const x_scale = d3.scaleLinear().domain(x_extent).range([0, chart_width]);

    // 垂直空間的分配 - 平均分布給各種類
    const y_extent = d3.extent(scatter_data, d => d.revenue);
    // 營收最小放最下方，與座標相反
    const y_scale = d3.scaleLinear().domain(y_extent).range([chart_height, 0]);

    //Draw Scatters
    this_svg.selectAll('.bar')
            .data(scatter_data)
            .enter()
            .append('circle')
            .attr('class', 'scatter')
            .attr('cx', d => x_scale(d.budget))
            .attr('cy', d => y_scale(d.revenue))
            .attr('r', 3)
            .style('fill', 'dodgerblue')
            .style('fill-opacity', 0.5);

    // 刻度與軸線-X
    const x_axis = d3.axisBottom(x_scale)
                    .ticks(5)
                    .tickFormat(format_ticks)
                    .tickSizeInner(-chart_height)
                    .tickSizeOuter(0);
    const x_axis_draw = this_svg.append('g')
                                .attr('class','x axis')
                                .attr('transform', `translate(-10, ${chart_height + 10})`)
                                .call(x_axis)
                                .call(add_label, 'Budget', 25, 0);
    // 拉開Y軸與字的距離
    x_axis_draw.selectAll('text').attr('dy','2em');
    
    // 刻度與軸線-Y
    const y_axis = d3.axisLeft(y_scale)
                    .ticks(5)
                    .tickFormat(format_ticks)
                    .tickSizeInner(-chart_height)
                    .tickSizeOuter(0);
    const y_axis_draw = this_svg.append('g')
                                .attr('class','y axis')
                                .attr('transform', `translate(-10, 10)`)
                                .call(y_axis)
                                .call(add_label, 'Revenue', -30, -30);
    // 拉開X軸與字的距離
    y_axis_draw.selectAll('text').attr('dx','-2em');

    //Draw header
    const header = this_svg.append('g')
                        .attr('class','Scatter-header')
                        .attr('transform',`translate(0, ${-chart_margin.top/2})`)
                        .append('text');
    header.append('tspan').text('Budget vs. Revenue in $US');
    header.append('tspan')
        .text('Top 100 films by budget, 2000-2009')
        .attr('x',0)
        .attr('y',20)
        .style('font-size','0.8em')
        .style('fill','#555');  





    function brushed(e){
        if(e.selection){
            // 取得選取的矩形座標
            const [[x0, y0], [x1, y1]] = e.selection;
            // 判斷有哪些資料落在選取範圍中
            const selected = scatter_data.filter(
                d => 
                    x0 <= x_scale(d.budget) && x_scale(d.budget) < x1 &&
                    y0 <= y_scale(d.revenue) && y_scale(d.revenue) < y1
            );
            // console.log(selected);
            update_selected(selected);
            highlight_selected(selected);
            
        }else{
            d3.select('.selected-body').html('');
            highlight_selected([]);
        }
    }

    let selected_id;

    function mouseover_list_item(){
        selected_id = d3.select(this).data()[0].id;
        d3.selectAll('.scatter')
            .filter(d => d.id === selected_id)
            .transition().attr('r', 6)
            .style('fill', 'coral');
    }

    function mouseout_list_item(){
        selected_id = d3.select(this).data()[0].id;
        d3.selectAll('.scatter')
            .filter(d => d.id === selected_id)
            .transition().attr('r', 3)
            .style('fill', 'dodgerblue')
    }

    function highlight_selected(data){
        const selected_IDs = data.map(d => d.id);
        d3.selectAll('.scatter')
            .filter(d => selected_IDs.includes(d.id))
            .style('fill', 'green');
        
        d3.selectAll('.scatter')
            .filter(d => selected_IDs.includes(d.id))
            .style('fill', 'dodgerblue');
    }



    function update_selected(data){
        d3.select('.selected-body')
            .selectAll('.selected-element')
            .on('mouseover', mouseover_list_item)
            .on('mouseout', mouseout_list_item)
            .data(data, d => d.id).join(
                enter => {
                    enter.append('p')
                        .attr('class', 'selected-element')
                        .html(
                            d => `<span class="selected-title">${d.title}</span>,
                                ${d.release_year}
                                <br>budget: ${format_ticks(d.budget)} | 
                                    revenue: ${format_ticks(d.revenue)}`
                            );
                },
                update => {
                    update
                },
                exit => {
                    exit.remove()
                }
            )
    }


    
    // Add brush
    const brush = d3.brush()
                    .extent([[0, 0], [svg_width, svg_height]])
                    .on('brush end', brushed);
    this_svg.append('g').attr('class', 'brush').call(brush);

    d3.select('.selected-container')
        .style('width', `${svg_width}px`)
        .style('height', `${svg_height}px`);
}




function ready(movies){
    const movies_clean = filter_data(movies);
    const scatter_data = prepare_scatter_data(movies_clean);   
    console.log(scatter_data);
    // 畫圖
    setup_canvas(scatter_data);
}

d3.csv('data/movies.csv',type).then(
    res => {
        ready(res);
    // console.log(res);
    }
)

