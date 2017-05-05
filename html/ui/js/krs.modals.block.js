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
 * @depends {krs.modals.js}
 */
var krs = (function(krs, $, undefined) {
	$("body").on("click", ".show_block_modal_action", function(event) {
		event.preventDefault();
		if (krs.fetchingModalData) {
			return;
		}
		krs.fetchingModalData = true;
        if ($(this).data("back") == "true") {
            krs.modalStack.pop(); // The forward modal
            krs.modalStack.pop(); // The current modal
        }
		var block = $(this).data("block");
        var isBlockId = $(this).data("id");
        var params = {
            "includeTransactions": "true"
        };
        if (isBlockId) {
            params["block"] = block;
        } else {
            params["height"] = block;
        }
        krs.sendRequest("getBlock+", params, function(response) {
			krs.showBlockModal(response);
		});
	});

	krs.showBlockModal = function(block) {
        krs.setBackLink();
        krs.modalStack.push({ class: "show_block_modal_action", key: "block", value: block.height });
        try {
            $("#block_info_modal_block").html(String(block.block).escapeHTML());
            $("#block_info_transactions_tab_link").tab("show");

            var blockDetails = $.extend({}, block);
            delete blockDetails.transactions;
            blockDetails.generator_formatted_html = krs.getAccountLink(blockDetails, "generator");
            delete blockDetails.generator;
            delete blockDetails.generatorRS;
            if (blockDetails.previousBlock) {
                blockDetails.previous_block_formatted_html = krs.getBlockLink(blockDetails.height - 1, blockDetails.previousBlock);
                delete blockDetails.previousBlock;
            }
            if (blockDetails.nextBlock) {
                blockDetails.next_block_formatted_html = krs.getBlockLink(blockDetails.height + 1, blockDetails.nextBlock);
                delete blockDetails.nextBlock;
            }
            if (blockDetails.timestamp) {
                blockDetails.blockGenerationTime = krs.formatTimestamp(blockDetails.timestamp);
            }
            var detailsTable = $("#block_info_details_table");
            detailsTable.find("tbody").empty().append(krs.createInfoTable(blockDetails));
            detailsTable.show();
            var transactionsTable = $("#block_info_transactions_table");
            if (block.transactions.length) {
                $("#block_info_transactions_none").hide();
                transactionsTable.show();
                block.transactions.sort(function (a, b) {
                    return a.timestamp - b.timestamp;
                });
                var rows = "";
                for (var i = 0; i < block.transactions.length; i++) {
                    var transaction = block.transactions[i];
                    if (transaction.amountNQT) {
                        transaction.amount = new BigInteger(transaction.amountNQT);
                        transaction.fee = new BigInteger(transaction.feeNQT);
                        rows += "<tr>" +
                        "<td>" + krs.getTransactionLink(transaction.transaction, krs.formatTimestamp(transaction.timestamp)) + "</td>" +
                        "<td>" + krs.getTransactionIconHTML(transaction.type, transaction.subtype) + "</td>" +
                        "<td>" + krs.formatAmount(transaction.amount) + "</td>" +
                        "<td>" + krs.formatAmount(transaction.fee) + "</td>" +
                        "<td>" + krs.getAccountLink(transaction, "sender") + "</td>" +
                        "<td>" + krs.getAccountLink(transaction, "recipient") + "</td>" +
                        "</tr>";
                    }
                }
                transactionsTable.find("tbody").empty().append(rows);
            } else {
                $("#block_info_transactions_none").show();
                transactionsTable.hide();
            }
            var blockInfoModal = $('#block_info_modal');
            if (!blockInfoModal.data('bs.modal') || !blockInfoModal.data('bs.modal').isShown) {
                blockInfoModal.modal("show");
            }
        } finally {
            krs.fetchingModalData = false;
        }
	};

	return krs;
}(krs || {}, jQuery));