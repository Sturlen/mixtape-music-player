import CasseteImage from "@/assets/mixtape_cassette_w_tape.svg"
import CasseteSpool from "@/assets/cassette_spool.svg"

export function Cassette() {
  return (
    <div className="pb-40 pt-20">
      <div className="aspect-video relative w-full">
        <img
          className="absolute left-[23.3%] top-[44.5%] w-[16%] reel"
          src={CasseteSpool}
        />
        <img
          className="absolute right-[23.6%] top-[44.5%] w-[16%] reel"
          src={CasseteSpool}
        />
        <img className="absolute my-auto w-full" src={CasseteImage} />
      </div>
    </div>
  )
}
