var unique_tags = Array();
var tag_filters = Array();
var contentDB = Array();
var pendingContent = Array();
var DataFetchProcessActive = false;

var IPFSDefaultHost = '127.0.0.1'
var EthereumDefaultHost = '127.0.0.1'

function postContentToEthereum(multihash) {
	//create tx and submit
	if (multihash.length > 0) {
		try {
			var txhash = ipfsContractInstance.SubmitContent(multihash,
				{from: web3.eth.accounts[0]}
			);
		}
		catch (err) {
			bootbox.alert(err.message);
		}
		//console.log(txhash);
	}
}

function constructIPFSManifest() {
	var name = $('#name').val();
	var icon = $('#icon').val();
	var description = $('#description').val();
	var tags = $('#tags').val();
	var multihash = $('#multihash').val();
	var fsname = $('#fsname').val();

	var manifest = {
		'name': name,
		'icon': icon,
		'description': description,
		'tags': tags,
		'multihash': multihash,
		'fsname': fsname
	}

	//console.log(manifest);

	postManifestToIPFS(manifest);
}

function postManifestToIPFS(json) {

	var ipfs = window.ipfsAPI(configIPFSHost, '5001');

	var ipfs_object = {'data': JSON.stringify(json)};

	ipfs.object.put(new ipfs.Buffer(JSON.stringify(ipfs_object)), 'json', function(err, res) {
	    if(err || !res) return console.error(err)

	    var manifest_hash = res.Hash;

		//pin the object
		ipfs.pin.add(manifest_hash, null, function(err, res) {
			//console.log("Pinned " + manifest_hash);

			postContentToEthereum(manifest_hash);
		});
	});
}

function updateTags(tags) {
	var splittags = tags.split(',');
	for (var a=0;a<splittags.length;a++) {
		if (unique_tags.indexOf(splittags[a]) == -1)
			unique_tags.push(splittags[a]);
	}

	//now re render the tag box
	renderTagFilters();
}

function fetchIPFSManifest(multihash) {
	if (multihash.substring(0,2) != "Qm" || multihash.length < 40)
		return console.log('Invalid multihash');

	var ipfs = window.ipfsAPI(configIPFSHost, '5001');
	ipfs.object.get(multihash, function(err, res) {
		if(err || !res) return console.error(err)

		var manifest = res.Data;
		manifest = JSON.parse(manifest);
		//add to contentDB
		for (var a=0;a<contentDB.length;a++) {
			if (contentDB[a].manifest_multihash == multihash) {
				contentDB[a].content = manifest;
				break;
			}
		}

		ipfs.pin.add(multihash, null, function() {
			//console.log("Pinned " + multihash)
			updateTags(manifest.tags);
			content_count++;
			renderWidgets();
		});
	});
}

function renderWidgets() {

	var widgetsPerPage = 10;
	var foundWidgets = 0;

	var bShowWidget;

	$('#content_list').html('');

	//console.log(contentDB);

	for (var a = contentDB.length-1; a >= 0; a--) {
		//console.log(contentDB[a]);
		var targetContent = contentDB[a].content;

		//console.log(targetContent);

		bShowWidget = false;
		if (tag_filters.length > 0) {
			var splittags = targetContent.tags.split(',');
			for (var t=0;t<splittags.length;t++) {
				if (tag_filters.indexOf(splittags[t])>=0) {
					bShowWidget = true;
					break;
				}
			}
		}
		else
			bShowWidget = true;

		if (bShowWidget) {
			if ($.isEmptyObject(targetContent))
				renderEmptyWidget(contentDB[a].manifest_multihash);
			else
				renderWidget(targetContent);

			foundWidgets++;
		}

		if (foundWidgets >= 10)
			break;
	}
}

function renderWidget(content) {

  var tags = Array();
  tags = content.tags.split(',');

  var tags_html = tags.reduce(function(previousValue, currentValue, index, array) {
  	if (currentValue == 'video')
  		labelClass = 'warning'
  	else
  		labelClass = 'primary'

  	return previousValue + '<span class="label label-' + labelClass + '"><span class="glyphicon glyphicon-tag"></span>&nbsp;' + currentValue + '</span>&nbsp;';
  }, '');

  if (!content.description)
  	content.description = '';

  var html = '' +
  '<div class="widget" id="' + content.multihash + '">' +
  '  <div class="widget-heading">' +
  '    <h3 class="widget-title">'+content.name+'</h3>' +
  //'       <a href="#" class="widget-close"><span class="icon-close">Close</span></a>' +
  '  </div>' +

  '  <ul class="widget-toolbar">' +
  '    <li><a href="http://'+configIPFSHost+':8080/ipfs/' + content.multihash + '">Open in browser</a></li>' +
  '    <li><a href="http://'+configIPFSHost+':8080/ipfs/' + content.multihash + '" download="' + content.fsname + '">Download</a></li>' +
  '    <li><a href="javascript:spawn(\'' + content.multihash + '\');">Open with app</a></li>' +
  '  </ul>' +

  '  <ul class="downloads">' +
  '    <li class="download download-active">' +
  '      <span class="icon-psd-40 download-icon"></span>' +
  '      <h4 class="download-name">'+content.fsname+'</h4>' +
  '      <p class="download-info">'+content.multihash + '<br>' + content.description+'</p>' +
  '    </li>' +
  '    <li class="tags">' +
  tags_html +
  '    </li>' +
  '  </ul>' +
  '</div>';
  //console.log(html);
  $('#content_list').prepend(html);
}

function spawn(multihash) {
	var spawn = require('child_process').spawn;
    prc = spawn('mplayer', ['http://'+configIPFSHost+':8080/ipfs/' + multihash],
    	{
		   detached: true,
		   stdio: [ 'ignore', 'ignore', 'ignore' ]
		});
}

function applyTagFilter(tag) {
	tag_filters.push(tag);
	renderTagFilters();
	renderWidgets();
}

function renderTagFilters() {
  var html = '';
  var defaultColor = 'primary';
  var labelColor;

  if (tag_filters.length > 0)
  	defaultColor = 'default';

  for (var a=0;a<unique_tags.length;a++) {
  	if (tag_filters.indexOf(unique_tags[a]) >= 0)
  		labelColor = 'primary';
  	else
		labelColor = defaultColor;

    html = html + '<a href="#" class="tag_filter_link" tag="' + unique_tags[a] + '"><span class="label label-' + labelColor + '"><span class="glyphicon glyphicon-tag"></span>&nbsp;' + unique_tags[a] + '</span></a>&nbsp;';
  }

  $('#tag_filter_contents').html(html);

  //wire up click events
  $('.tag_filter_link').on('click', function() {
  	applyTagFilter($(this).attr('tag'));
  });
}

function startDataFetchProcess() {
	if (DataFetchProcessActive)
		return;
	else
		DataFetchProcessActive = true;

	doDataFetchProcess();
}

function doDataFetchProcess() {
	//if array is empty then quit
	if (pendingContent.length == 0) {
		DataFetchProcessActive = false;
		renderWidgets();
		return;
	}

	//console.log(pendingContent[0]);

	//remove the first element and set to try again
	fetchIPFSManifest(pendingContent.shift());
	setTimeout(doDataFetchProcess, 100);	
}

function showAddModal() {
  bootbox.dialog({
    title: "<b>Add new content</b>",
    message: '<div class="row">  ' +
      '<div class="col-md-12"> ' +
      '<form class="form-horizontal"> ' +
      '<div class="form-group"> ' +
      ' <label class="col-md-4 control-label" for="name">Name</label> ' +
      ' <div class="col-md-8"> ' +
      '  <input id="name" name="name" type="text" class="form-control input-md"> ' +
      ' </div> ' +
      '</div> ' +
      '<div class="form-group"> ' +
      ' <label class="col-md-4 control-label" for="tags">Tags</label> ' +
      ' <div class="col-md-8"> ' +
      '  <input id="tags" name="tags" type="text" class="form-control input-md"> ' +
      ' </div> ' +
      '</div> ' +
      '<div class="form-group"> ' +
      ' <label class="col-md-4 control-label" for="multihash">Multihash</label> ' +
      ' <div class="col-md-8"> ' +
      '  <input id="multihash" name="multihash" type="text" class="form-control input-md"> ' +
      ' </div> ' +
      '</div> ' +
      '<div class="form-group"> ' +
      ' <label class="col-md-4 control-label" for="fsname">Filesystem name</label> ' +
      ' <div class="col-md-8"> ' +
      '  <input id="fsname" name="fsname" type="text" class="form-control input-md"> ' +
      ' </div> ' +
      '</div> ' +
      '</form> </div>  </div>',
    buttons: {
      success: {
        label: "Add",
        className: "btn-success",
        callback: function () {
        	constructIPFSManifest();
          }
        }
      }
    }
  );
}

function renderEmptyWidget(manifest_multihash) {
	pendingContent.push(manifest_multihash);

 	var html = '' +
	  '<div class="widget" id="' + manifest_multihash + '">' +
	  '  <div class="widget-heading">' +
	  '    <h3 class="widget-title">Searching IPFS swarm...</h3>' +
	  '  </div>' +

	  '  <ul class="widget-toolbar">' +
	  '  </ul>' +

	  '  <ul class="downloads">' +
	  '    <li class="download download-active">' +
	  '      <h4 class="download-name"></h4>' +
	  '      <p class="download-info">' + manifest_multihash + '</p>' +
	  '    </li>' +
	  '  </ul>' +
	  '</div>';

	$('#content_list').prepend(html);
}



$(function() {

	//set default hosts
	if (localStorage.getItem('IPFSHost') == null)
		localStorage.setItem('IPFSHost', IPFSDefaultHost);
	if (localStorage.getItem('EthereumHost') == null)
		localStorage.setItem('EthereumHost', EthereumDefaultHost);

	configEthereumHost = localStorage.getItem('EthereumHost');
	configIPFSHost = localStorage.getItem('IPFSHost')

	ipfsContract = web3.eth.contract([{"constant":true,"inputs":[],"name":"content_count","outputs":[{"name":"","type":"uint16"}],"type":"function"},{"constant":false,"inputs":[{"name":"multihash","type":"string"}],"name":"SubmitContent","outputs":[],"type":"function"},{"anonymous":false,"inputs":[{"indexed":false,"name":"multihash","type":"string"}],"name":"NewContent","type":"event"}]);

	contractAddress = "0xb372018f3be9e171df0581136b59d2faf73a7d5d"; // mainnet

	//set up the ethereum instance
	web3.setProvider(new web3.providers.HttpProvider('http://' + configEthereumHost +':8545'));

	ipfsContractInstance = ipfsContract.at(contractAddress);

	try {
		var mostRecentBlock = web3.eth.blockNumber;
		var block = web3.eth.getBlock(mostRecentBlock);
		var bt = new Date(block.timestamp * 1000);
		//var bt = timeConverter(block.timestamp);
		var ct = new Date();

		var diff = ct.getTime() - bt.getTime();
		var seconds = Math.floor(diff / 1000);


		$('#last_block').html('Last block ' + seconds + ' seconds ago');
	}	
	catch (err) {
		bootbox.alert(err.message);
	}
	content_count = 0;

	//fetch all previous events
	var event_fetcher = ipfsContractInstance.NewContent(null, {fromBlock: 0, toBlock: mostRecentBlock, address: contractAddress});
	event_fetcher.get(function(error, result) {
		for (var a=result.length-1; a>=0; a--) {
			var manifest_multihash = result[a].args.multihash;
			var v1_remaps = {
				"QmSyp9nMeFQDPUfMSCVoab3hhhQjK7fNxrbF2VQYY33j34":"QmQcd2h8xCF7NrHhD7bzfbGFJsEKpmDbhsA19EKrkEzVuJ",
				"QmXWXR8ku6MmxeZxtZPf4dTK3VwesKQJsFdZnNx7NhpN2A":"QmcdNSsUjr9yH3ECK3G4QmCBtqPybCBwwdGVRFowh5WzHe",
				"QmWm5kaQKn8JGjXSJaYv9Amg12cxJNXoxrQkoGmRmwkQhS":"QmafY2K196gF82p9Q2qUF17DVfS4feawN7jtK3xc7YTAgY",
				"QmSas1iUaR6ckwGkTn5kxzXt8j12Y9oet9RfTCCCVy5335":"QmSUYvje9wESrC6kE6yC9WRR71bBT3JuBEA69KH1vjBydv",
				"QmQr3b5PLLT4RLeUi1sgpUnGq8MfedAxqa9pEREQEXeBoy":"Qmbd2ngVaQtd16nFV4nT2yonA7XhDKWmDbxdDq4FTKY1x2"
			}

			if (v1_remaps.hasOwnProperty(manifest_multihash)) {
				console.log("Remaping v1 multihash " + manifest_multihash + ' to ' + v1_remaps[manifest_multihash]);
				manifest_multihash = v1_remaps[manifest_multihash];
			}

			pendingContent.push(manifest_multihash);
			contentDB.push({
				manifest_multihash: manifest_multihash,
				content: {}
			});
		}

		renderWidgets();
		startDataFetchProcess();
	});

	//activate watcher
	event_watcher = ipfsContractInstance.NewContent('', {fromBlock: mostRecentBlock, toBlock: "latest", address: contractAddress});
	event_watcher.watch(function(error, result) {
		pendingContent.push(result.args.multihash);
		contentDB.push({
			manifest_multihash: result.args.multihash,
			content: {}
		});
		renderWidgets();
		startDataFetchProcess();
	});

	//wire up add content button
	$('#btnAddContent').on('click', function() {
		showAddModal();
	});

	$('#btnClearFilters').on('click', function() {
		tag_filters = [];
		renderTagFilters();
		renderWidgets();
	});

	//wire up settings button
	$('#settings_btn').on('click', function() {

		var IPFSHost = localStorage.getItem('IPFSHost');
		var EthereumHost = localStorage.getItem('EthereumHost');

		bootbox.dialog({
		    title: "<b>Settings</b>",
		    message: '<div class="row">  ' +
		      '<div class="col-md-12"> ' +
		      '<form class="form-horizontal"> ' +
		      '<div class="form-group"> ' +
		      ' <label class="col-md-4 control-label">IPFS Host</label> ' +
		      ' <div class="col-md-8"> ' +
		      '  <input id="configIPFSHost" type="text" class="form-control input-md" value="'+IPFSHost+'"> ' +
		      ' </div> ' +
		      '</div> ' +
		      '<div class="form-group"> ' +
		      ' <label class="col-md-4 control-label">Ethereum Host</label> ' +
		      ' <div class="col-md-8"> ' +
		      '  <input id="configEthereumHost" type="text" class="form-control input-md" value="'+EthereumHost+'"> ' +
		      ' </div> ' +
		      '</div> ' +
		      '</form> </div>  </div>',
		    buttons: {
		      success: {
		        label: "Save",
		        className: "btn-success",
		        callback: function () {
		        	if ($('#configIPFSHost').val() != null)
						localStorage.setItem('IPFSHost', $('#configIPFSHost').val());
					if ($('#configEthereumHost').val() != null)
						localStorage.setItem('EthereumHost', $('#configEthereumHost').val());

		        	var remote = require('remote');
					remote.getCurrentWindow().reload();
		        }
		      }
		    }
		});
	});
});

function timeConverter(UNIX_timestamp){
  var a = new Date(UNIX_timestamp * 1000);
  var months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  var year = a.getFullYear();
  var month = months[a.getMonth()];
  var date = a.getDate();
  var hour = a.getHours();
  var min = a.getMinutes();
  var sec = a.getSeconds();
  var time = date + ' ' + month + ' ' + year + ' ' + hour + ':' + min + ':' + sec ;
  return time;
}