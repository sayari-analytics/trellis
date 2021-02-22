const hierarchy = trellis.layout.Hierarchy.Layout()

const categoricalScale = d3.scaleOrdinal(d3.schemeTableau10)
function color(x) {
  return categoricalScale(x)
}

function styleNode(group) {
  return {
    color: color(group),
    labelSize: 10,
    labelWordWrap: 260,
    stroke: [{ color: '#FFF', width: 2 }, { color: color(group), width: 1 }],
    icon: { type: 'textIcon', family: 'Material Icons', text: 'person', color: '#fff', size: 21 },
    badge: [{
      position: 45,
      color: color(group),
      stroke: '#FFF',
      icon: {
        type: 'textIcon',
        family: 'Helvetica',
        size: 10,
        color: '#FFF',
        text: '8',
      }
    }],
  }
}

const nodes = [
  {
    "id": "rich.dimichele@enron.com",
    "label": "rich.dimichele@enron.com",
    "count": 3
  },
  {
    "id": "jeff.skilling@enron.com",
    "label": "jeff.skilling@enron.com",
    "count": 15
  },
  {
    "id": "j..kean@enron.com",
    "label": "j..kean@enron.com",
    "count": 7
  },
  {
    "id": "kenneth.lay@enron.com",
    "label": "kenneth.lay@enron.com",
    "count": 13
  },
  {
    "id": "d..steffes@enron.com",
    "label": "d..steffes@enron.com",
    "count": 7
  },
  {
    "id": "louise.kitchen@enron.com",
    "label": "louise.kitchen@enron.com",
    "count": 12
  },
  {
    "id": "steven.kean@enron.com",
    "label": "steven.kean@enron.com",
    "count": 5
  },
  {
    "id": "dolores.muzzy@enron.com",
    "label": "dolores.muzzy@enron.com",
    "count": 3
  },
  {
    "id": "julie.ferrara@enron.com",
    "label": "julie.ferrara@enron.com",
    "count": 3
  },
  {
    "id": "torrey.moorer@enron.com",
    "label": "torrey.moorer@enron.com",
    "count": 2
  },
  {
    "id": "judy.walters@enron.com",
    "label": "judy.walters@enron.com",
    "count": 1
  },
  {
    "id": "chad.gardner@enron.com",
    "label": "chad.gardner@enron.com",
    "count": 1
  },
  {
    "id": "bill.cordes@enron.com",
    "label": "bill.cordes@enron.com",
    "count": 2
  },
  {
    "id": "akhoja@enron.com",
    "label": "akhoja@enron.com",
    "count": 1
  },
  {
    "id": "dconnal@enron.com",
    "label": "dconnal@enron.com",
    "count": 1
  },
  {
    "id": "aborgatt@azurix.com",
    "label": "aborgatt@azurix.com",
    "count": 1
  },
  {
    "id": "mbaker2@enron.com",
    "label": "mbaker2@enron.com",
    "count": 1
  },
  {
    "id": "feliciag@marcusevanstx.com",
    "label": "feliciag@marcusevanstx.com",
    "count": 1
  },
  {
    "id": "mvasque@enron.com",
    "label": "mvasque@enron.com",
    "count": 1
  }
].map((node) => ({ ...node, style: styleNode(node.count), radius: 18 }))

const edges = [
  {
    "source": "rich.dimichele@enron.com",
    "target": "jeff.skilling@enron.com",
    "subject": "FW: MSN - Jesse Call Summary",
    "timestamp": 996607382000
  },
  {
    "source": "j..kean@enron.com",
    "target": "kenneth.lay@enron.com",
    "subject": "",
    "timestamp": 1005770116000
  },
  {
    "source": "j..kean@enron.com",
    "target": "d..steffes@enron.com",
    "subject": "RE: RTO week message",
    "timestamp": 1001941166000
  },
  {
    "source": "j..kean@enron.com",
    "target": "louise.kitchen@enron.com",
    "subject": "RE:",
    "timestamp": 1000254393000
  },
  {
    "source": "steven.kean@enron.com",
    "target": "kenneth.lay@enron.com",
    "subject": "Call to Bob Glynn",
    "timestamp": 986829120000
  },
  {
    "source": "steven.kean@enron.com",
    "target": "jeff.skilling@enron.com",
    "subject": "California - Jan 13 meeting",
    "timestamp": 979480320000
  },
  {
    "source": "steven.kean@enron.com",
    "target": "louise.kitchen@enron.com",
    "subject": "California Update--0717.01",
    "timestamp": 995440620000
  },
  {
    "source": "dolores.muzzy@enron.com",
    "target": "julie.ferrara@enron.com",
    "subject": "Rodeo tickets for tonight's performance",
    "timestamp": 982854000000
  },
  {
    "source": "kenneth.lay@enron.com",
    "target": "torrey.moorer@enron.com",
    "subject": "Associate/Analyst Program",
    "timestamp": 998591065000
  },
  {
    "source": "kenneth.lay@enron.com",
    "target": "judy.walters@enron.com",
    "subject": "Thank You",
    "timestamp": 991252847000
  },
  {
    "source": "kenneth.lay@enron.com",
    "target": "chad.gardner@enron.com",
    "subject": "Associate/Analyst Program",
    "timestamp": 998591065000
  },
  {
    "source": "kenneth.lay@enron.com",
    "target": "j..kean@enron.com",
    "subject": "FW: Salary",
    "timestamp": 1004391675000
  },
  {
    "source": "kenneth.lay@enron.com",
    "target": "julie.ferrara@enron.com",
    "subject": "Associate/Analyst Program",
    "timestamp": 998591065000
  },
  {
    "source": "kenneth.lay@enron.com",
    "target": "louise.kitchen@enron.com",
    "subject": "Executive Committee",
    "timestamp": 998771284000
  },
  {
    "source": "kenneth.lay@enron.com",
    "target": "d..steffes@enron.com",
    "subject": "Associate/Analyst Program",
    "timestamp": 998591065000
  },
  {
    "source": "kenneth.lay@enron.com",
    "target": "rich.dimichele@enron.com",
    "subject": "Executive Committee",
    "timestamp": 998771284000
  },
  {
    "source": "kenneth.lay@enron.com",
    "target": "dolores.muzzy@enron.com",
    "subject": "Associate/Analyst Program",
    "timestamp": 998591065000
  },
  {
    "source": "kenneth.lay@enron.com",
    "target": "bill.cordes@enron.com",
    "subject": "Executive Committee",
    "timestamp": 998771284000
  },
  {
    "source": "d..steffes@enron.com",
    "target": "louise.kitchen@enron.com",
    "subject": "FW: FERC Oversight",
    "timestamp": 1011224596000
  },
  {
    "source": "d..steffes@enron.com",
    "target": "j..kean@enron.com",
    "subject": "FW: Doubletree PowerPoint Presentation",
    "timestamp": 1008878799000
  },
  {
    "source": "d..steffes@enron.com",
    "target": "dolores.muzzy@enron.com",
    "subject": "FW: Save the Date - September 5th",
    "timestamp": 998861269000
  },
  {
    "source": "jeff.skilling@enron.com",
    "target": "rich.dimichele@enron.com",
    "subject": "Please Plan to Attend",
    "timestamp": 996693958000
  },
  {
    "source": "jeff.skilling@enron.com",
    "target": "d..steffes@enron.com",
    "subject": "Please Plan to Attend",
    "timestamp": 997194012000
  },
  {
    "source": "jeff.skilling@enron.com",
    "target": "bill.cordes@enron.com",
    "subject": "RE: Please Plan to Attend",
    "timestamp": 996699670000
  },
  {
    "source": "jeff.skilling@enron.com",
    "target": "akhoja@enron.com",
    "subject": "A/A Website",
    "timestamp": 948976620000
  },
  {
    "source": "jeff.skilling@enron.com",
    "target": "dconnal@enron.com",
    "subject": "A/A Website",
    "timestamp": 948976620000
  },
  {
    "source": "jeff.skilling@enron.com",
    "target": "louise.kitchen@enron.com",
    "subject": "RE: Please Plan to Attend",
    "timestamp": 996699670000
  },
  {
    "source": "jeff.skilling@enron.com",
    "target": "aborgatt@azurix.com",
    "subject": "A/A Website",
    "timestamp": 948976620000
  },
  {
    "source": "jeff.skilling@enron.com",
    "target": "j..kean@enron.com",
    "subject": "RE: Please Plan to Attend",
    "timestamp": 996699670000
  },
  {
    "source": "jeff.skilling@enron.com",
    "target": "mbaker2@enron.com",
    "subject": "A/A Website",
    "timestamp": 948976620000
  },
  {
    "source": "jeff.skilling@enron.com",
    "target": "steven.kean@enron.com",
    "subject": "",
    "timestamp": 987736680000
  },
  {
    "source": "jeff.skilling@enron.com",
    "target": "feliciag@marcusevanstx.com",
    "subject": "Re: Invitation to address UTILITIES 2001",
    "timestamp": 989440440000
  },
  {
    "source": "jeff.skilling@enron.com",
    "target": "mvasque@enron.com",
    "subject": "A/A Website",
    "timestamp": 948976620000
  },
  {
    "source": "torrey.moorer@enron.com",
    "target": "louise.kitchen@enron.com",
    "subject": "RE: EOL Average Deal Count as of 3-14-01",
    "timestamp": 984678480000
  },
  {
    "source": "louise.kitchen@enron.com",
    "target": "j..kean@enron.com",
    "subject": "",
    "timestamp": 1007392487000
  },
  {
    "source": "louise.kitchen@enron.com",
    "target": "d..steffes@enron.com",
    "subject": "RE: Eddy Daniels",
    "timestamp": 1012786341000
  },
  {
    "source": "louise.kitchen@enron.com",
    "target": "steven.kean@enron.com",
    "subject": "Names of potential speakers",
    "timestamp": 965380740000
  },
  {
    "source": "louise.kitchen@enron.com",
    "target": "kenneth.lay@enron.com",
    "subject": "",
    "timestamp": 1006909853000
  },
  {
    "source": "louise.kitchen@enron.com",
    "target": "jeff.skilling@enron.com",
    "subject": "EnronOnline Management Report 3-21-2000",
    "timestamp": 953836920000
  },
  {
    "source": "louise.kitchen@enron.com",
    "target": "julie.ferrara@enron.com",
    "subject": "Re: Slide",
    "timestamp": 965399640000
  }
].map((edge) => ({ id: `${edge.source}::${edge.target}`, source: edge.source, target: edge.target, label: edge.subject }))

window.trellisData = { nodes, edges }