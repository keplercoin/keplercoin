/******************************************************************************
 * Copyright © 2013-2016 The KPL Core Developers.                             *
 *                                                                            *
 * See the AUTHORS.txt, DEVELOPER-AGREEMENT.txt and LICENSE.txt files at      *
 * the top-level directory of this distribution for the individual copyright  *
 * holder information and the developer policies on copyright and licensing.  *
 *                                                                            *
 * Unless otherwise agreed in a custom licensing agreement, no part of the    *
 * KPL software, including this file, may be copied, modified, propagated,    *
 * or distributed except according to the terms contained in the LICENSE.txt  *
 * file.                                                                      *
 *                                                                            *
 * Removal or modification of this copyright notice is prohibited.            *
 *                                                                            *
 ******************************************************************************/

/**
 * @depends {krs.js}
 */
var krs = (function(krs, $) {
	krs.blocksPageType = null;
	krs.tempBlocks = [];
	var trackBlockchain = false;
	krs.averageBlockGenerationTime = 60;

	krs.getBlock = function(blockID, callback, pageRequest) {
		krs.sendRequest("getBlock" + (pageRequest ? "+" : ""), {
			"block": blockID
		}, function(response) {
			if (response.errorCode && response.errorCode == -1 || !krs.constants || krs.constants.EPOCH_BEGINNING == 0) {
				setTimeout(function (){ krs.getBlock(blockID, callback, pageRequest); }, 2500);
			} else {
				if (callback) {
					response.block = blockID;
					callback(response);
				}
			}
		}, true);
	};

	krs.handleInitialBlocks = function(response) {
		krs.blocks.push(response);
		if (krs.blocks.length < 10 && response.previousBlock) {
			krs.getBlock(response.previousBlock, krs.handleInitialBlocks);
		} else {
			krs.checkBlockHeight(krs.blocks[0].height);
			if (krs.state) {
				//if no new blocks in 6 hours, show blockchain download progress..
				var timeDiff = krs.state.time - krs.blocks[0].timestamp;
				if (timeDiff > 60 * 60 * 18) {
					if (timeDiff > 60 * 60 * 24 * 14) {
						krs.setStateInterval(30);
					} else if (timeDiff > 60 * 60 * 24 * 7) {
						//second to last week
						krs.setStateInterval(15);
					} else {
						//last week
						krs.setStateInterval(10);
					}
					krs.downloadingBlockchain = true;
					$("#krs_update_explanation").find("span").hide();
					$("#krs_update_explanation_wait").attr("style", "display: none !important");
					$("#downloading_blockchain, #krs_update_explanation_blockchain_sync").show();
					$("#show_console").hide();
					krs.updateBlockchainDownloadProgress();
				} else {
					//continue with faster state intervals if we still haven't reached current block from within 1 hour
					if (timeDiff < 60 * 60) {
						krs.setStateInterval(30);
						trackBlockchain = false;
					} else {
						krs.setStateInterval(10);
						trackBlockchain = true;
					}
				}
			}
			$("#krs_current_block_time").empty().append(krs.formatTimestamp(krs.blocks[0].timestamp));
			$(".krs_current_block").empty().append(String(krs.blocks[0].height).escapeHTML());
		}
	};

	krs.handleNewBlocks = function(response) {
		if (krs.downloadingBlockchain) {
			//new round started...
			if (krs.tempBlocks.length == 0 && krs.state.lastBlock != response.block) {
				return;
			}
		}

		//we have all blocks 	
		if (response.height - 1 == krs.lastBlockHeight || krs.tempBlocks.length == 99) {
			var newBlocks = [];

			//there was only 1 new block (response)
			if (krs.tempBlocks.length == 0) {
				//remove oldest block, add newest block
				krs.blocks.unshift(response);
				newBlocks.push(response);
			} else {
				krs.tempBlocks.push(response);
				//remove oldest blocks, add newest blocks
				[].unshift.apply(krs.blocks, krs.tempBlocks);
				newBlocks = krs.tempBlocks;
				krs.tempBlocks = [];
			}

			if (krs.blocks.length > 100) {
				krs.blocks = krs.blocks.slice(0, 100);
			}
			krs.checkBlockHeight(krs.blocks[0].height);
			krs.incoming.updateDashboardBlocks(newBlocks);
		} else {
			krs.tempBlocks.push(response);
			krs.getBlock(response.previousBlock, krs.handleNewBlocks);
		}
	};

	krs.checkBlockHeight = function(blockHeight) {
		if (blockHeight) {
			krs.lastBlockHeight = blockHeight;
		}
	};

	//we always update the dashboard page..
	krs.incoming.updateDashboardBlocks = function(newBlocks) {
        var timeDiff;
		if (krs.downloadingBlockchain) {
			if (krs.state) {
				timeDiff = krs.state.time - krs.blocks[0].timestamp;
				if (timeDiff < 60 * 60 * 18) {
					if (timeDiff < 60 * 60) {
						krs.setStateInterval(30);
					} else {
						krs.setStateInterval(10);
						trackBlockchain = true;
					}
					krs.downloadingBlockchain = false;
					$("#dashboard_message").hide();
					$("#downloading_blockchain, #krs_update_explanation_blockchain_sync").hide();
					$("#krs_update_explanation_wait").removeAttr("style");
					if (krs.settings["console_log"]) {
						$("#show_console").show();
					}
					//todo: update the dashboard blocks!
					$.growl($.t("success_blockchain_up_to_date"), {
						"type": "success"
					});
					krs.checkAliasVersions();
					krs.checkIfOnAFork();
				} else {
					if (timeDiff > 60 * 60 * 24 * 14) {
						krs.setStateInterval(30);
					} else if (timeDiff > 60 * 60 * 24 * 7) {
						//second to last week
						krs.setStateInterval(15);
					} else {
						//last week
						krs.setStateInterval(10);
					}

					krs.updateBlockchainDownloadProgress();
				}
			}
		} else if (trackBlockchain) {
			//continue with faster state intervals if we still haven't reached current block from within 1 hour
            timeDiff = krs.state.time - krs.blocks[0].timestamp;
			if (timeDiff < 60 * 60) {
				krs.setStateInterval(30);
				trackBlockchain = false;
			} else {
				krs.setStateInterval(10);
			}
		}

		block = krs.blocks[0];
		$("#krs_current_block_time").empty().append(krs.formatTimestamp(block.timestamp));
		$(".krs_current_block").empty().append(String(block.height).escapeHTML());

		//update number of confirmations... perhaps we should also update it in tne krs.transactions array
		$("#dashboard_table").find("tr.confirmed td.confirmations").each(function() {
			if ($(this).data("incoming")) {
				$(this).removeData("incoming");
				return true;
			}
			var confirmations = parseInt($(this).data("confirmations"), 10);
			var nrConfirmations = confirmations + newBlocks.length;
			if (confirmations <= 10) {
				$(this).data("confirmations", nrConfirmations);
				$(this).attr("data-content", $.t("x_confirmations", {
					"x": krs.formatAmount(nrConfirmations, false, true)
				}));

				if (nrConfirmations > 10) {
					nrConfirmations = '10+';
				}
				$(this).html(nrConfirmations);
			} else {
				$(this).attr("data-content", $.t("x_confirmations", {
					"x": krs.formatAmount(nrConfirmations, false, true)
				}));
			}
		});
		var blockLink = $("#sidebar_block_link");
		if (blockLink.length > 0) {
			blockLink.html(krs.getBlockLink(krs.lastBlockHeight));
		}
	};

	krs.pages.blocks = function() {
		if (krs.blocksPageType == "forged_blocks") {
			$("#forged_fees_total_box, #forged_blocks_total_box").show();
			$("#blocks_transactions_per_hour_box, #blocks_generation_time_box").hide();

			krs.sendRequest("getAccountBlocks+", {
				"account": krs.account,
				"firstIndex": krs.pageNumber * krs.itemsPerPage - krs.itemsPerPage,
				"lastIndex": krs.pageNumber * krs.itemsPerPage
			}, function(response) {
				if (response.blocks && response.blocks.length) {
					if (response.blocks.length > krs.itemsPerPage) {
						krs.hasMorePages = true;
						response.blocks.pop();
					}
					krs.blocksPageLoaded(response.blocks);
				} else {
					krs.blocksPageLoaded([]);
				}
			});
		} else {
			$("#forged_fees_total_box, #forged_blocks_total_box").hide();
			$("#blocks_transactions_per_hour_box, #blocks_generation_time_box").show();
			
			krs.sendRequest("getBlocks+", {
				"firstIndex": krs.pageNumber * krs.itemsPerPage - krs.itemsPerPage,
				"lastIndex": krs.pageNumber * krs.itemsPerPage
			}, function(response) {
				if (response.blocks && response.blocks.length) {
					if (response.blocks.length > krs.itemsPerPage) {
						krs.hasMorePages = true;
						response.blocks.pop();
					}
					krs.blocksPageLoaded(response.blocks);
				} else {
					krs.blocksPageLoaded([]);
				}
			});
		}
	};

	krs.incoming.blocks = function() {
		krs.loadPage("blocks");
	};

    //区块列表
	krs.blocksPageLoaded = function(blocks) {
		var rows = "";
		var totalAmount = new BigInteger("0");
		var totalFees = new BigInteger("0");
		var totalTransactions = 0;

		for (var i = 0; i < blocks.length; i++) {
			var block = blocks[i];
			totalAmount = totalAmount.add(new BigInteger(block.totalAmountNQT));
			totalFees = totalFees.add(new BigInteger(block.totalFeeNQT));
			totalTransactions += block.numberOfTransactions;
			rows += "<tr>" +
                "<td><a href='#' data-block='" + String(block.height).escapeHTML() + "' data-blockid='" + String(block.block).escapeHTML() + "' class='block show_block_modal_action'" + (block.numberOfTransactions > 0 ? " style='font-weight:bold'" : "") + ">" + String(block.height).escapeHTML() + "</a></td>" +
                "<td>" + krs.formatTimestamp(block.timestamp) + "</td>" +
                "<td>" + krs.formatAmount(block.totalAmountNQT) + "</td>" +
                "<td>" + krs.formatAmount(block.totalFeeNQT) + "</td>" +
                "<td>" + krs.formatAmount(block.numberOfTransactions) + "</td>" +
                "<td>" + krs.getAccountLink(block, "generator") + "</td>" +
                "<td>" + krs.formatVolume(block.payloadLength) + "</td>" +
				"<td>" + krs.baseTargetPercent(block).pad(4) + " %</td>" +
            "</tr>";
		}

        var blocksAverageAmount = $("#blocks_average_amount");
        if (krs.blocksPageType == "forged_blocks") {
			krs.sendRequest("getAccountBlockCount+", {
				"account": krs.account
			}, function(response) {
				if (response.numberOfBlocks && response.numberOfBlocks > 0) {
					$("#forged_blocks_total").html(response.numberOfBlocks).removeClass("loading_dots");
                    var avgFee = new Big(krs.accountInfo.forgedBalanceNQT).div(response.numberOfBlocks).div(new Big("100000000")).toFixed(2);
                    $("#blocks_average_fee").html(krs.formatStyledAmount(krs.convertToNQT(avgFee))).removeClass("loading_dots");
				} else {
					$("#forged_blocks_total").html(0).removeClass("loading_dots");
					$("#blocks_average_fee").html(0).removeClass("loading_dots");
				}
			});
			$("#forged_fees_total").html(krs.formatStyledAmount(krs.accountInfo.forgedBalanceNQT)).removeClass("loading_dots");
			blocksAverageAmount.removeClass("loading_dots");
			blocksAverageAmount.parent().parent().css('visibility', 'hidden');
			$("#blocks_page").find(".ion-stats-bars").parent().css('visibility', 'hidden');
		} else {
			var time;
            if (blocks.length) {
				var startingTime = blocks[blocks.length - 1].timestamp;
				var endingTime = blocks[0].timestamp;
				time = endingTime - startingTime;
			} else {
				time = 0;
			}
            var averageFee = 0;
            var averageAmount = 0;
			if (blocks.length) {
				averageFee = new Big(totalFees.toString()).div(new Big("100000000")).div(new Big(String(blocks.length))).toFixed(2);
				averageAmount = new Big(totalAmount.toString()).div(new Big("100000000")).div(new Big(String(blocks.length))).toFixed(2);
			}
			averageFee = krs.convertToNQT(averageFee);
			averageAmount = krs.convertToNQT(averageAmount);
			if (time == 0) {
				$("#blocks_transactions_per_hour").html("0").removeClass("loading_dots");
			} else {
				$("#blocks_transactions_per_hour").html(Math.round(totalTransactions / (time / 60) * 60)).removeClass("loading_dots");
			}
			$("#blocks_average_generation_time").html(Math.round(time / krs.itemsPerPage) + "s").removeClass("loading_dots");
			$("#blocks_average_fee").html(krs.formatStyledAmount(averageFee)).removeClass("loading_dots");
			blocksAverageAmount.parent().parent().css('visibility', 'visible');
			$("#blocks_page").find(".ion-stats-bars").parent().css('visibility', 'visible');
			blocksAverageAmount.html(krs.formatStyledAmount(averageAmount)).removeClass("loading_dots");
		}
		krs.dataLoaded(rows);
	};

	$("#blocks_page_type").find(".btn").click(function(e) {
		e.preventDefault();
		krs.blocksPageType = $(this).data("type");
		$("#blocks_average_amount, #blocks_average_fee, #blocks_transactions_per_hour, #blocks_average_generation_time, #forged_blocks_total, #forged_fees_total").html("<span>.</span><span>.</span><span>.</span></span>").addClass("loading_dots");
        var blocksTable = $("#blocks_table");
        blocksTable.find("tbody").empty();
		blocksTable.parent().addClass("data-loading").removeClass("data-empty");
		krs.loadPage("blocks");
	});

	$("#goto_forged_blocks").click(function(e) {
		e.preventDefault();
		$("#blocks_page_type").find(".btn:last").button("toggle");
		krs.blocksPageType = "forged_blocks";
		krs.goToPage("blocks");
	});

	return krs;
}(krs || {}, jQuery));