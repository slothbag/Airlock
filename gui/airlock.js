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

	ipfs.block.put(new ipfs.Buffer(JSON.stringify(json)), function(err, res) {
	    if(err || !res) return console.error(err)

	    var manifest_hash = res.Key;
		console.log("Manifest hash is " + manifest_hash);
		postContentToEthereum(manifest_hash);
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
	ipfs.block.get(multihash, function(err, res) {
		if(err || !res) return console.error(err)

		if (res.multihash.substring(0,2) != "Qm" || res.multihash.length < 40)
			return console.log('Invalid multihash');

		//add to contentDB
		contentDB.push(res);

		//process the tags, add them to unique tag list
		updateTags(res.tags);
		content_count++;
		//$('#content_count').html("Countent Count = " + content_count);
	});
}

function renderPageOfWidgets() {
	console.log('Rendering page of widgets');

	$('#content_list').html('');

	for (var a=0;a<contentDB.length;a++) {
		bFilterTagFound = false;
		if (tag_filters.length > 0) {
			var splittags = contentDB[a].tags.split(',');
			for (var t=0;t<splittags.length;t++) {
				if (tag_filters.indexOf(splittags[t])>=0) {
					bFilterTagFound = true;
					break;
				}
			}

			if (bFilterTagFound)
				renderContentWidget(contentDB[a]);
		}
		else
			renderContentWidget(contentDB[a]);
	}
}

function renderContentWidget(content) {
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
  '<div class="widget">' +
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
	renderPageOfWidgets();
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
		renderPageOfWidgets();
		return;
	}

	console.log(pendingContent[0]);

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
	}	
	catch (err) {
		bootbox.alert(err.message);
	}
	content_count = 0;

	//fetch all previous events
	var event_fetcher = ipfsContractInstance.NewContent(null, {fromBlock: 0, toBlock: mostRecentBlock, address: contractAddress});
	event_fetcher.get(function(error, result) {
		for (var a=result.length-1; a>=0; a--) {
			pendingContent.push(result[a].args.multihash)
			startDataFetchProcess();
		}
	});

	//activate watcher
	event_watcher = ipfsContractInstance.NewContent('', {fromBlock: mostRecentBlock, toBlock: "latest", address: contractAddress});
	event_watcher.watch(function(error, result) {
		pendingContent.push(result.args.multihash)
		startDataFetchProcess();
	});

	renderTagFilters();

	//wire up add content button
	$('#btnAddContent').on('click', function() {
		showAddModal();
	});

	$('#btnClearFilters').on('click', function() {
		tag_filters = [];
		renderTagFilters();
		renderPageOfWidgets();
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
