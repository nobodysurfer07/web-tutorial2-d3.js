const friends = {
    lewis:['Apple', 'Banana', 'Kiwi'],
    max:['Banana', 'Kiwi'],
    george:['Apple', 'Kiwi']
};

const this_svg = d3.select('svg');
d3.selectAll('button').on('click', click);

function click(){
    const this_fruit_list = friends[this.dataset.name];
    update(this_fruit_list);
}

function update(data){
    this_svg.selectAll('text')
            .data(data, d => d)
            .join(
                enter => {
                    enter.append('text').text(d => d)
                        .attr('x', -100)
                        .attr('y', (d, i) => 50 + i*30)
                        .style('fill', 'green')
                        .transition()
                        .attr('x', 30)
                },
                update => {
                    update.transition()
                        .style('fill', 'red')
                        .attr('y', (d, i) => 50 + i*30)
                },
                exit => {
                    exit.transition()
                        .attr('x', 150)
                        .style('fill', 'yellow')
                        .remove()
                }
            )
}