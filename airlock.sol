contract Airlock {

    uint16 public content_count = 0;
    
    event NewContent(string multihash); 

    function SubmitContent(string multihash) {
        content_count ++;
        NewContent(multihash);
    }
}