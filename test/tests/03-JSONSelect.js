module.exports = {
	name : "JSONSelect test",
	json : {
		url : "/json",
    select : ".name",
		method : "POST"
	},
	expected : "name1, name2"
};
